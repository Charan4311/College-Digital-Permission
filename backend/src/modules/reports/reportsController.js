const xlsx = require('xlsx');
const OutpassRequest = require('../../models/OutpassRequest');
const User = require('../../models/User');
const { mapStatusToSimple } = require('../../config/constants');
const { getISTDateRange } = require('../../utils/dateValidation');

const APPROVED_STATUSES = ['APPROVED', 'CLEARED', 'ISSUED', 'USED'];
const PENDING_STATUSES = [
  'PENDING_CTPO', 'PENDING_HOD', 'PENDING_HOSTEL_INCHARGE', 'PENDING_PLACEMENT_OFFICER'
];
const REJECTED_STATUSES = [
  'REJECTED_CTPO', 'REJECTED_HOD', 'REJECTED_HOSTEL_INCHARGE', 'REJECTED_PLACEMENT_OFFICER', 'REJECTED', 'CANCELLED'
];

function formatDateDDMMYYYY(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// ── 1. GET TREND ANALYTICS ──────────────────────────────────────────────
exports.getTrendAnalytics = async (req, res) => {
  try {
    const { range = '7days' } = req.query;
    const now = new Date();
    let startDate = new Date();
    let intervalUnit = 'day';

    if (range === '7days') {
      startDate.setDate(now.getDate() - 7);
      intervalUnit = 'day';
    } else if (range === '6months') {
      startDate.setMonth(now.getMonth() - 6);
      intervalUnit = 'month';
    } else if (range === 'thisyear' || range === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
      intervalUnit = 'month';
    } else {
      startDate.setDate(now.getDate() - 30);
      intervalUnit = 'day';
    }

    const requests = await OutpassRequest.find({
      createdAt: { $gte: startDate, $lte: now }
    });

    const trendData = [];

    const getISTDayStr = (date) => {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric'
      }).format(new Date(date));
    };

    const getISTMonthStr = (date) => {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        year: 'numeric'
      }).format(new Date(date));
    };

    if (intervalUnit === 'day') {
      const daysCount = range === '7days' ? 7 : 30;

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = getISTDayStr(d);

        const dayRequests = requests.filter((r) => {
          return getISTDayStr(r.createdAt) === dayStr;
        });

        trendData.push({
          date: dayStr,
          Total: dayRequests.length,
          Approved: dayRequests.filter((r) => APPROVED_STATUSES.includes(r.status)).length,
          Pending: dayRequests.filter((r) => PENDING_STATUSES.includes(r.status)).length,
          Rejected: dayRequests.filter((r) => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    } else {
      const monthsCount = range === '6months' ? 6 : 12;

      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = getISTMonthStr(d);

        const monthRequests = requests.filter((r) => {
          return getISTMonthStr(r.createdAt) === monthLabel;
        });

        trendData.push({
          date: monthLabel,
          Total: monthRequests.length,
          Approved: monthRequests.filter((r) => APPROVED_STATUSES.includes(r.status)).length,
          Pending: monthRequests.filter((r) => PENDING_STATUSES.includes(r.status)).length,
          Rejected: monthRequests.filter((r) => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    }

    res.json({
      success: true,
      data: {
        timeRange: range,
        requestsTrend: trendData
      }
    });
  } catch (error) {
    console.error('getTrendAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 2. EXPORT EXCEL REPORT ──────────────────────────────────────────────
exports.exportTrendExcel = async (req, res) => {
  try {
    const { range = '7days' } = req.query;
    const now = new Date();
    let startDate = new Date();

    if (range === '7days') startDate.setDate(now.getDate() - 7);
    else if (range === '6months') startDate.setMonth(now.getMonth() - 6);
    else if (range === 'thisyear' || range === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setDate(now.getDate() - 30);

    const requests = await OutpassRequest.find({ createdAt: { $gte: startDate, $lte: now } })
      .populate('studentId', 'name rollNo year residenceType')
      .sort({ createdAt: 1 });

    const totalCount = requests.length;
    const approvedCount = requests.filter((r) => APPROVED_STATUSES.includes(r.status)).length;
    const pendingCount = requests.filter((r) => PENDING_STATUSES.includes(r.status)).length;
    const rejectedCount = requests.filter((r) => REJECTED_STATUSES.includes(r.status)).length;

    const rangeLabel =
      range === '7days'
        ? 'Last 7 Days'
        : range === '6months'
          ? 'Last 6 Months'
          : range === 'thisyear' || range === 'year'
            ? 'This Year'
            : 'Last 30 Days';

    const autoFit = (rows, minW = 18) => {
      if (!rows || !rows.length) return [];
      const keys = Object.keys(rows[0]);
      return keys.map((key) => {
        let max = key.toString().length;
        rows.forEach((r) => {
          const v = r[key] !== undefined && r[key] !== null ? r[key].toString() : '';
          if (v.length > max) max = v.length;
        });
        return { wch: Math.max(max + 6, minW) };
      });
    };

    const isDaily = range === '7days' || range === '30days';
    const trendRows = [];

    if (isDaily) {
      const daysCount = range === '7days' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayLabel = formatDateDDMMYYYY(d);

        const dayReqs = requests.filter((r) => {
          const rd = new Date(r.createdAt);
          return (
            rd.getDate() === d.getDate() &&
            rd.getMonth() === d.getMonth() &&
            rd.getFullYear() === d.getFullYear()
          );
        });

        trendRows.push({
          Date: dayLabel,
          Total: dayReqs.length,
          Approved: dayReqs.filter((r) => APPROVED_STATUSES.includes(r.status)).length,
          Pending: dayReqs.filter((r) => PENDING_STATUSES.includes(r.status)).length,
          Rejected: dayReqs.filter((r) => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    } else {
      const monthsCount = range === '6months' ? 6 : 12;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthReqs = requests.filter((r) => {
          const rd = new Date(r.createdAt);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        });

        trendRows.push({
          Month: monthLabel,
          Total: monthReqs.length,
          Approved: monthReqs.filter((r) => APPROVED_STATUSES.includes(r.status)).length,
          Pending: monthReqs.filter((r) => PENDING_STATUSES.includes(r.status)).length,
          Rejected: monthReqs.filter((r) => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    }

    trendRows.push({
      [isDaily ? 'Date' : 'Month']: `TOTAL (${rangeLabel.toUpperCase()})`,
      Total: totalCount,
      Approved: approvedCount,
      Pending: pendingCount,
      Rejected: rejectedCount
    });

    const requestRows = requests
      .slice()
      .reverse()
      .map((r) => ({
        'Date Submitted': formatDateDDMMYYYY(r.createdAt),
        'Reference ID': r.referenceId || r._id.toString(),
        'Roll Number': r.studentId?.rollNo || 'N/A',
        'Student Name': r.studentId?.name || 'N/A',
        'Student Type': r.studentId?.residenceType === 'hosteler' ? 'Hosteller' : 'Day Scholar',
        'Status': mapStatusToSimple(r.status),
        'Reason': r.reason || 'N/A'
      }));

    const workbook = xlsx.utils.book_new();

    const trendSheet = xlsx.utils.json_to_sheet(trendRows);
    trendSheet['!cols'] = autoFit(trendRows, 20);
    xlsx.utils.book_append_sheet(workbook, trendSheet, 'Requests Trend');

    const detailsSheet = xlsx.utils.json_to_sheet(
      requestRows.length > 0 ? requestRows : [{ Note: 'No records found' }]
    );
    detailsSheet['!cols'] = autoFit(
      requestRows.length > 0 ? requestRows : [{ Note: 'No records found' }],
      18
    );
    xlsx.utils.book_append_sheet(workbook, detailsSheet, 'All Requests Detailed');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Trend_Report_${range}_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('exportTrendExcel error:', error);
    res.status(500).json({ success: false, message: 'Server error exporting report' });
  }
};

// ── 3. HOSTEL SUMMARY CARDS ─────────────────────────────────────────────
exports.getHostelSummary = async (req, res) => {
  try {
    const hostelerStudents = await User.find({
      role: 'STUDENT',
      $or: [
        { residenceType: { $in: ['hosteler', 'HOSTELER'] } },
        { studentType: { $in: ['hosteler', 'HOSTELER', 'Hosteler'] } }
      ]
    }).select('_id');

    const studentIds = hostelerStudents.map((s) => s._id);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);

    const hostelReachedFilter = {
      studentId: { $in: studentIds },
      requestType: 'OUTPASS',
      $or: [
        { status: 'PENDING_HOSTEL_INCHARGE' },
        { status: { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] } },
        { status: 'REJECTED_HOSTEL_INCHARGE' },
        { status: { $regex: /^REJECTED_HOSTEL/i } },
        { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } }
      ]
    };

    const [weekReqs, monthReqs] = await Promise.all([
      OutpassRequest.find({
        ...hostelReachedFilter,
        createdAt: { $gte: startOfWeek }
      }),
      OutpassRequest.find({
        ...hostelReachedFilter,
        createdAt: { $gte: startOfMonth }
      })
    ]);

    const calculateCounts = (list) => {
      const pending = list.filter((r) => r.status === 'PENDING_HOSTEL_INCHARGE').length;
      const approved = list.filter((r) => ['APPROVED', 'ISSUED', 'CLEARED', 'USED'].includes(r.status)).length;
      const rejected = list.filter((r) =>
        r.status === 'REJECTED_HOSTEL_INCHARGE' ||
        /^REJECTED_HOSTEL/i.test(r.status) ||
        (['REJECTED', 'CANCELLED'].includes(r.status) && ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'].includes(r.rejectedByRole))
      ).length;
      return {
        total: approved + pending + rejected,
        approved,
        pending,
        rejected
      };
    };

    res.json({
      success: true,
      data: {
        week: calculateCounts(weekReqs),
        month: calculateCounts(monthReqs)
      }
    });
  } catch (error) {
    console.error('getHostelSummary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 4. HOSTEL REVIEW HISTORY ────────────────────────────────────────────
exports.getHostelHistory = async (req, res) => {
  try {
    const { range, from, to, type, status, q } = req.query;

    const hostelerStudents = await User.find({
      role: 'STUDENT',
      $or: [
        { residenceType: { $in: ['hosteler', 'HOSTELER'] } },
        { studentType: { $in: ['hosteler', 'HOSTELER', 'Hosteler'] } }
      ]
    }).select('_id');

    let studentIds = hostelerStudents.map((s) => s._id);

    let filter = {
      studentId: { $in: studentIds },
      requestType: 'OUTPASS',
      $or: [
        { status: 'PENDING_HOSTEL_INCHARGE' },
        { status: { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] } },
        { status: 'REJECTED_HOSTEL_INCHARGE' },
        { status: { $regex: /^REJECTED_HOSTEL/i } },
        { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } }
      ]
    };

    if (type && type !== 'ALL') {
      filter.requestType = type.toUpperCase();
    }

    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      delete filter.$or;
      if (s === 'APPROVED') {
        filter.status = { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] };
      } else if (s === 'PENDING') {
        filter.status = 'PENDING_HOSTEL_INCHARGE';
      } else if (s === 'REJECTED') {
        filter.$or = [
          { status: 'REJECTED_HOSTEL_INCHARGE' },
          { status: { $regex: /^REJECTED_HOSTEL/i } },
          { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } }
        ];
      }
    }

    const now = new Date();
    if (range === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (range === 'month') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (from || to) {
      const dateRange = getISTDateRange(from, to);
      if (dateRange?.query) {
        filter.createdAt = dateRange.query;
      }
    }

    let requests = await OutpassRequest.find(filter)
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });

    if (q && q.trim()) {
      const queryLower = q.trim().toLowerCase();
      requests = requests.filter((r) => {
        const name = r.studentId?.name?.toLowerCase() || '';
        const roll = r.studentId?.rollNo?.toLowerCase() || '';
        const ref = r.referenceId?.toLowerCase() || '';
        return name.includes(queryLower) || roll.includes(queryLower) || ref.includes(queryLower);
      });
    }

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('getHostelHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
