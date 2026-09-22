const xlsx = require('xlsx');
const OutpassRequest = require('../../models/OutpassRequest'); 

const APPROVED_STATUSES = ['APPROVED', 'CLEARED', 'ISSUED', 'USED'];
const PENDING_STATUSES = [
  'PENDING_CTPO', 'PENDING_HOD', 'PENDING_HOSTEL_INCHARGE', 'PENDING_PLACEMENT_OFFICER'
];
const REJECTED_STATUSES = [
  'REJECTED_CTPO', 'REJECTED_HOD', 'REJECTED_HOSTEL_INCHARGE', 'REJECTED_PLACEMENT_OFFICER', 'REJECTED', 'CANCELLED'
];

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

    // Fetch requests in range
    const requests = await OutpassRequest.find({
      createdAt: { $gte: startDate, $lte: now }
    });

    const trendData = [];

    if (intervalUnit === 'day') {
      const daysCount = range === '7days' ? 7 : 30;

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const dayRequests = requests.filter(r => {
          const rDate = new Date(r.createdAt);
          return (
            rDate.getDate() === d.getDate() &&
            rDate.getMonth() === d.getMonth() &&
            rDate.getFullYear() === d.getFullYear()
          );
        });

        trendData.push({
          date: dayStr,
          Total: dayRequests.length,
          Approved: dayRequests.filter(r => APPROVED_STATUSES.includes(r.status)).length,
          Pending: dayRequests.filter(r => PENDING_STATUSES.includes(r.status)).length,
          Rejected: dayRequests.filter(r => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    } else {
      const monthsCount = range === '6months' ? 6 : 12;

      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const monthRequests = requests.filter(r => {
          const rDate = new Date(r.createdAt);
          return rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
        });

        trendData.push({
          date: monthLabel,
          Total: monthRequests.length,
          Approved: monthRequests.filter(r => APPROVED_STATUSES.includes(r.status)).length,
          Pending: monthRequests.filter(r => PENDING_STATUSES.includes(r.status)).length,
          Rejected: monthRequests.filter(r => REJECTED_STATUSES.includes(r.status)).length
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
      .populate('studentId', 'name rollNo year')
      .sort({ createdAt: 1 });

    const totalCount = requests.length;
    const approvedCount = requests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
    const pendingCount = requests.filter(r => PENDING_STATUSES.includes(r.status)).length;
    const rejectedCount = requests.filter(r => REJECTED_STATUSES.includes(r.status)).length;

    const rangeLabel = range === '7days' ? 'Last 7 Days'
      : range === '6months' ? 'Last 6 Months'
      : (range === 'thisyear' || range === 'year') ? 'This Year'
      : 'Last 30 Days';

    // Auto-fit helper so columns fit data nicely with padding
    const autoFit = (rows, minW = 18) => {
      if (!rows || !rows.length) return [];
      const keys = Object.keys(rows[0]);
      return keys.map(key => {
        let max = key.toString().length;
        rows.forEach(r => {
          const v = (r[key] !== undefined && r[key] !== null) ? r[key].toString() : '';
          if (v.length > max) max = v.length;
        });
        return { wch: Math.max(max + 6, minW) };
      });
    };

    // 1. Trend Rows
    const trendRows = [];
    const isDaily = (range === '7days' || range === '30days');

    if (isDaily) {
      const daysCount = range === '7days' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const dayReqs = requests.filter(r => {
          const rd = new Date(r.createdAt);
          return rd.getDate() === d.getDate() && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        });

        trendRows.push({
          'Date': dayLabel,
          'Total': dayReqs.length,
          'Approved': dayReqs.filter(r => APPROVED_STATUSES.includes(r.status)).length,
          'Pending': dayReqs.filter(r => PENDING_STATUSES.includes(r.status)).length,
          'Rejected': dayReqs.filter(r => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    } else {
      const monthsCount = range === '6months' ? 6 : 12;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthReqs = requests.filter(r => {
          const rd = new Date(r.createdAt);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        });

        trendRows.push({
          'Month': monthLabel,
          'Total': monthReqs.length,
          'Approved': monthReqs.filter(r => APPROVED_STATUSES.includes(r.status)).length,
          'Pending': monthReqs.filter(r => PENDING_STATUSES.includes(r.status)).length,
          'Rejected': monthReqs.filter(r => REJECTED_STATUSES.includes(r.status)).length
        });
      }
    }

    // Add Total summary row
    trendRows.push({
      [isDaily ? 'Date' : 'Month']: `TOTAL (${rangeLabel.toUpperCase()})`,
      'Total': totalCount,
      'Approved': approvedCount,
      'Pending': pendingCount,
      'Rejected': rejectedCount
    });

    // 2. Detailed Data Rows
    const requestRows = requests.slice().reverse().map(r => ({
      'Date Submitted': new Date(r.createdAt).toLocaleDateString('en-US'),
      'Time': new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      'Reference ID': r.referenceId || r._id.toString(),
      'Roll Number': r.studentId?.rollNo || 'N/A',
      'Student Name': r.studentId?.name || 'N/A',
      'Status': r.status,
      'Reason': r.reason || 'N/A'
    }));

    // Build Excel Workbook
    const workbook = xlsx.utils.book_new();

    // Sheet 1: Trend Breakdown
    const trendSheet = xlsx.utils.json_to_sheet(trendRows);
    trendSheet['!cols'] = autoFit(trendRows, 20);
    xlsx.utils.book_append_sheet(workbook, trendSheet, 'Requests Trend');

    // Sheet 2: All Requests Detailed
    const detailsSheet = xlsx.utils.json_to_sheet(requestRows.length > 0 ? requestRows : [{ 'Note': 'No records found' }]);
    detailsSheet['!cols'] = autoFit(requestRows.length > 0 ? requestRows : [{ 'Note': 'No records found' }], 18);
    xlsx.utils.book_append_sheet(workbook, detailsSheet, 'All Requests Detailed');

    // Send File Buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Trend_Report_${range}_${Date.now()}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('exportTrendExcel error:', error);
    res.status(500).json({ success: false, message: 'Server error exporting report' });
  }
};
