import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  LuClipboardList,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuSearch,
  LuEye,
  LuFileText,
  LuDownload,
} from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table } from '../../components/ui/table';


// ============================================================
// CTPO HISTORY / ALL REQUESTS
// ============================================================

export default function CTPOHistory() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();

  // ==========================================================
  // STATE
  // ==========================================================

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [activeStatus, setActiveStatus] =
    useState('ALL');

  const [searchInput, setSearchInput] =
    useState('');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [typeFilter, setTypeFilter] =
    useState('ALL');

  const [timeFilter, setTimeFilter] =
    useState('ALL');


  // ==========================================================
  // READ STATUS FROM URL
  // ==========================================================

  useEffect(() => {
    const status = String(
      searchParams.get('status') || 'ALL'
    ).toUpperCase();

    if (
      status === 'APPROVED' ||
      status === 'REJECTED'
    ) {
      setActiveStatus(status);
    } else {
      setActiveStatus('ALL');
    }
  }, [searchParams]);


  // ==========================================================
  // LOAD ALL CTPO REQUESTS
  // ==========================================================

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/outpass/all/for-me'
      );

      const data = response?.data;

      let loadedRequests = [];

      if (Array.isArray(data)) {
        loadedRequests = data;
      } else if (Array.isArray(data?.requests)) {
        loadedRequests = data.requests;
      } else if (Array.isArray(data?.data)) {
        loadedRequests = data.data;
      } else if (
        Array.isArray(data?.data?.requests)
      ) {
        loadedRequests = data.data.requests;
      } else if (Array.isArray(data?.results)) {
        loadedRequests = data.results;
      }

      setRequests(
        Array.isArray(loadedRequests)
          ? loadedRequests
          : []
      );
    } catch (err) {
      console.error(
        'CTPO All Requests Error:',
        err
      );

      setRequests([]);

      if (
        err?.response?.status === 404
      ) {
        setError(
          'All Requests API returned 404. Please verify the backend route.'
        );
      } else {
        setError(
          err?.response?.data?.message ||
          'Failed to load all requests.'
        );
      }
    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadRequests();
  }, []);


  // ==========================================================
  // NORMALIZE REQUESTS
  // ==========================================================

  const normalizedRequests = useMemo(() => {
    return requests.map((request) => {

      const rawStatus = String(
        request?.status ||
        request?.approvalStatus ||
        request?.requestStatus ||
        request?.currentStatus ||
        ''
      ).toUpperCase();


      // ------------------------------------------------------
      // PERMISSION TYPE
      // ------------------------------------------------------

      let permissionType =
        request?.permissionType?.name ||
        request?.permissionType?.label ||
        request?.permissionTypeName ||
        request?.requestType ||
        request?.type ||
        request?.permissionType ||
        'Other';


      const typeMap = {
        OUTPASS: 'Out-Pass',
        OUT_PASS: 'Out-Pass',
        MESS_FEE: 'Mess Fee',
        MESS: 'Mess Fee',
        INTERNSHIP: 'Internship',
        LIBRARY: 'Library',
        WORKSHOP: 'Workshop / Seminar',
        EVENT: 'Event',
        INDUSTRIAL_VISIT: 'Industrial Visit',
        HOSTEL_LEAVE: 'Hostel Leave',
        OTHER: 'Other',
      };


      permissionType =
        typeMap[
          String(permissionType)
            .toUpperCase()
        ] ||
        permissionType;


      // ====================================================
// STUDENT OBJECT
// ====================================================

const student =
  request?.student ||
  request?.studentDetails ||
  request?.studentId ||
  request?.user ||
  request?.userDetails ||
  request?.applicant ||
  request?.applicantDetails ||
  request?.createdBy ||
  request?.submittedBy ||
  request?.requester ||
  request?.requesterDetails ||
  {};

      // ------------------------------------------------------
      // STUDENT NAME
      // ------------------------------------------------------

      const studentName =
        request?.studentName ||
        request?.studentNameSnapshot ||
        request?.studentFullName ||
        request?.applicantName ||
        student?.name ||
        student?.fullName ||
        student?.studentName ||
        student?.profile?.fullName ||
        request?.name ||
        request?.fullName ||
        request?.requesterName ||
        'Unknown Student';


      // ------------------------------------------------------
      // ROLL NUMBER
      // ------------------------------------------------------

      const rollNo =
        request?.rollNo ||
        request?.rollNumber ||
        request?.rollNumberSnapshot ||
        request?.studentRollNo ||
        request?.studentRollNumber ||
        student?.rollNo ||
        student?.rollNumber ||
        student?.rollno ||
        student?.registrationNumber ||
        student?.registrationNo ||
        '-';


      // ------------------------------------------------------
      // REQUEST ID
      // ------------------------------------------------------

      const requestId =
        request?._id ||
        request?.id ||
        request?.requestId;


      return {
        ...request,

        _id: requestId,

        _status: rawStatus,

        _permissionType:
          String(permissionType),

        _studentName:
          String(studentName),

        _rollNo:
          String(rollNo),
      };
    });
  }, [requests]);


  // ==========================================================
  // APPROVAL STAGES
  // ==========================================================

  const getApprovalStages = (request) => {
    const sources = [
      request?.approvalStages,
      request?.approvalHistory,
      request?.approvals,
      request?.workflowStages,
      request?.stages,
      request?.approvalSteps,
      request?.steps,
      request?.workflowHistory,
    ];

    return sources
      .filter(Array.isArray)
      .flat();
  };


  // ==========================================================
  // NORMALIZE DECISION
  // ==========================================================

  const normalizeDecision = (value) => {
    const decision = String(value || '')
      .trim()
      .toUpperCase();

    if (
      [
        'APPROVED',
        'APPROVE',
        'ACCEPTED',
        'ACCEPT',
        'CLEARED',
      ].includes(decision)
    ) {
      return 'APPROVED';
    }

    if (
      [
        'REJECTED',
        'REJECT',
        'DENIED',
        'DENY',
      ].includes(decision)
    ) {
      return 'REJECTED';
    }

    return '';
  };


  // ==========================================================
  // STAGE ROLE
  // ==========================================================

  const getStageRole = (stage) => {
    return String(
      stage?.approverRole ||
      stage?.role ||
      stage?.approver?.role ||
      stage?.authorityRole ||
      stage?.approver?.authorityRole ||
      stage?.approverType ||
      stage?.stepRole ||
      ''
    )
      .trim()
      .toUpperCase();
  };


  // ==========================================================
  // STAGE DECISION
  // ==========================================================

  const getStageDecision = (stage) => {

    const directDecision =
      normalizeDecision(
        stage?.decision ||
        stage?.action ||
        stage?.status ||
        stage?.approvalStatus ||
        stage?.result
      );

    if (directDecision) {
      return directDecision;
    }

    if (
      stage?.approved === true ||
      stage?.isApproved === true
    ) {
      return 'APPROVED';
    }

    if (
      stage?.rejected === true ||
      stage?.isRejected === true
    ) {
      return 'REJECTED';
    }

    return '';
  };


  // ==========================================================
  // AUTHORITY TEXT
  // ==========================================================

  const getDecisionAuthorityText = (
    request
  ) => {

    const values = [
      request?.rejectedByRole,
      request?.rejectedBy?.role,
      request?.rejectedBy?.authorityRole,
      request?.lastActionByRole,
      request?.lastDecisionByRole,
      request?.lastApproverRole,
      request?.currentApproverRole,
      request?.currentAuthorityRole,
      request?.currentStage?.role,
      request?.currentStage?.approverRole,
      request?.currentStage?.authorityRole,
      request?.lastStage?.role,
      request?.lastStage?.approverRole,
      request?.lastStage?.authorityRole,
      request?.rejection?.role,
      request?.rejection?.rejectedByRole,
      request?.rejection?.authorityRole,
    ];

    return values
      .filter(Boolean)
      .map((value) => {

        if (
          typeof value === 'object'
        ) {
          return [
            value?.role,
            value?.authorityRole,
            value?.name,
            value?.label,
            value?.title,
          ]
            .filter(Boolean)
            .join(' ');
        }

        return String(value);
      })
      .join(' ')
      .trim()
      .toUpperCase();
  };


  // ==========================================================
  // GET CTPO DECISION
  // ==========================================================

  const getCTPODecision = (request) => {

    const directDecision =
      normalizeDecision(
        request?.ctpoDecision ||
        request?.ctpoStatus ||
        request?.ctpoApprovalStatus ||
        request?.ctpoDecisionStatus
      );

    if (directDecision) {
      return directDecision;
    }


    // --------------------------------------------------------
    // CHECK APPROVAL STAGES
    // --------------------------------------------------------

    const stages =
      getApprovalStages(request);

    const ctpoStages =
      stages.filter((stage) => {

        const role =
          getStageRole(stage);

        return (
          (
            role === 'CTPO' ||
            role.includes('CTPO')
          ) &&
          Boolean(
            getStageDecision(stage)
          )
        );
      });


    if (ctpoStages.length > 0) {
      return getStageDecision(
        ctpoStages[
          ctpoStages.length - 1
        ]
      );
    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const status = String(
      request?._status ||
      request?.status ||
      request?.requestStatus ||
      request?.currentStatus ||
      request?.approvalStatus ||
      ''
    )
      .trim()
      .toUpperCase();


    // CTPO rejected

    if (
      status === 'REJECTED_CTPO' ||
      status === 'REJECTED CTPO' ||
      status === 'CTPO_REJECTED' ||
      status === 'CTPO REJECTED'
    ) {
      return 'REJECTED';
    }


    // Still waiting for CTPO

    if (
      status.includes('PENDING_CTPO') ||
      status.includes('PENDING CTPO')
    ) {
      return '';
    }


    // Later workflow means CTPO approved

    if (
      status.includes('HOD') ||
      status.includes('WARDEN') ||
      status.includes('HOSTEL') ||
      status.includes('PLACEMENT') ||
      status.includes('DEAN') ||
      status.includes('PRINCIPAL') ||
      status.includes('SECURITY') ||
      status.includes('FACULTY') ||
      status === 'PENDING_HOD' ||
      status === 'PENDING_PLACEMENT_OFFICER' ||
      status === 'PENDING_HOSTEL_INCHARGE' ||
      status === 'APPROVED' ||
      status === 'FINALIZED' ||
      status === 'COMPLETED' ||
      status === 'ISSUED' ||
      status === 'VERIFIED' ||
      status === 'USED' ||
      status === 'RETURNED'
    ) {
      return 'APPROVED';
    }


    // Plain rejected

    if (
      status === 'REJECTED' ||
      status === 'DENIED' ||
      status === 'REJECT'
    ) {

      const authorityText =
        getDecisionAuthorityText(
          request
        );


      if (
        authorityText.includes('CTPO')
      ) {
        return 'REJECTED';
      }


      if (
        authorityText.includes('HOD') ||
        authorityText.includes('WARDEN') ||
        authorityText.includes('HOSTEL') ||
        authorityText.includes('PLACEMENT') ||
        authorityText.includes('DEAN') ||
        authorityText.includes('PRINCIPAL') ||
        authorityText.includes('SECURITY') ||
        authorityText.includes('FACULTY')
      ) {
        return 'APPROVED';
      }


      if (
        request?.hodDecision ||
        request?.hodStatus ||
        request?.hodApprovalStatus ||
        request?.hodRemarks ||
        request?.hodRejectedAt ||
        request?.hostelDecision ||
        request?.placementDecision
      ) {
        return 'APPROVED';
      }
    }


    return '';
  };


  // ==========================================================
  // COUNTS
  // ==========================================================

  const allCount =
    normalizedRequests.length;

  const approvedCount =
    normalizedRequests.filter(
      (request) =>
        getCTPODecision(request) ===
        'APPROVED'
    ).length;

  const rejectedCount =
    normalizedRequests.filter(
      (request) =>
        getCTPODecision(request) ===
        'REJECTED'
    ).length;

  const pendingCount =
    normalizedRequests.filter(
      (request) =>
        getCTPODecision(request) === ''
    ).length;


  // ==========================================================
  // STATUS DISPLAY
  // ==========================================================

  const getCTPODisplayStatus =
    (request) => {

      const decision =
        getCTPODecision(request);

      if (
        decision === 'APPROVED'
      ) {
        return 'APPROVED';
      }

      if (
        decision === 'REJECTED'
      ) {
        return 'REJECTED';
      }

      return 'PENDING_CTPO';
    };


  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch = () => {
    setSearchTerm(
      searchInput
        .trim()
        .toLowerCase()
    );
  };


  const handleSearchKeyDown = (
    event
  ) => {

    if (
      event.key === 'Enter'
    ) {
      handleSearch();
    }
  };


  // ==========================================================
  // STATUS CHANGE
  // ==========================================================

  const handleStatusChange = (
    status
  ) => {

    const normalizedStatus =
      String(status)
        .toUpperCase();

    setActiveStatus(
      normalizedStatus
    );

    if (
      normalizedStatus === 'ALL'
    ) {
      setSearchParams({});
    } else {
      setSearchParams({
        status:
          normalizedStatus,
      });
    }
  };


  // ==========================================================
  // FILTERED REQUESTS
  // ==========================================================

  const filteredRequests =
    useMemo(() => {

      const now = new Date();

      return normalizedRequests.filter(
        (request) => {

          // --------------------------------------------------
          // STATUS
          // --------------------------------------------------

          let matchesStatus = true;

          if (
            activeStatus === 'APPROVED'
          ) {
            matchesStatus =
              getCTPODecision(
                request
              ) === 'APPROVED';
          }

          if (
            activeStatus === 'REJECTED'
          ) {
            matchesStatus =
              getCTPODecision(
                request
              ) === 'REJECTED';
          }


          // --------------------------------------------------
          // TYPE
          // --------------------------------------------------

          let matchesType = true;

          if (
            typeFilter !== 'ALL'
          ) {
            matchesType =
              request._permissionType
                .toLowerCase()
                .includes(
                  typeFilter.toLowerCase()
                );
          }


          // --------------------------------------------------
          // SEARCH
          // --------------------------------------------------

          let matchesSearch = true;

          if (searchTerm) {

            const searchableText =
              `
                ${request._studentName}
                ${request._rollNo}
                ${request._permissionType}
                ${request._status}
                ${request?.reason || ''}
                ${request?.purpose || ''}
                ${request?.description || ''}
                ${request?.details || ''}
              `.toLowerCase();

            matchesSearch =
              searchableText.includes(
                searchTerm
              );
          }


          // --------------------------------------------------
          // TIME
          // --------------------------------------------------

          let matchesTime = true;

          if (
            timeFilter !== 'ALL'
          ) {

            const requestDate =
              new Date(
                request?.createdAt ||
                request?.submittedAt ||
                request?.createdDate ||
                request?.requestDate
              );

            if (
              !Number.isNaN(
                requestDate.getTime()
              )
            ) {

              if (
                timeFilter === 'TODAY'
              ) {
                matchesTime =
                  requestDate.toDateString() ===
                  now.toDateString();
              }


              if (
                timeFilter === 'WEEK'
              ) {
                const weekAgo =
                  new Date(now);

                weekAgo.setDate(
                  now.getDate() - 7
                );

                matchesTime =
                  requestDate >=
                  weekAgo;
              }


              if (
                timeFilter === 'MONTH'
              ) {
                matchesTime =
                  requestDate.getMonth() ===
                    now.getMonth() &&
                  requestDate.getFullYear() ===
                    now.getFullYear();
              }
            }
          }


          return (
            matchesStatus &&
            matchesType &&
            matchesSearch &&
            matchesTime
          );
        }
      );

    }, [
      normalizedRequests,
      activeStatus,
      typeFilter,
      timeFilter,
      searchTerm,
    ]);


  // ==========================================================
  // VIEW REQUEST
  // ==========================================================

  const handleViewRequest = (
    request
  ) => {

    if (!request?._id) {
      console.warn(
        'Request ID not found:',
        request
      );

      return;
    }

    navigate(
      `/outpass/${request._id}?mode=approval`
    );
  };


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    value
  ) => {

    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };


  // ==========================================================
  // EXPORT PDF
  // ==========================================================

  const handleExport = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('CTPO Requests Report', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })} · Total Requests: ${filteredRequests.length}`,
        14,
        25
      );

      const tableHeaders = [
        ['#', 'Reference ID', 'Type', 'Student', 'Roll No', 'Details', 'Submitted', 'Status'],
      ];

      const tableData = filteredRequests.map((request, idx) => [
        idx + 1,
        request?.referenceId || request?._referenceId || '—',
        request._permissionType || 'Permission',
        request._studentName || '—',
        request._rollNo || '—',
        (
          request?.reason ||
          request?.purpose ||
          request?.description ||
          request?.details ||
          '—'
        ).substring(0, 32),
        formatDate(
          request?.createdAt ||
            request?.submittedAt ||
            request?.createdDate ||
            request?.requestDate
        ),
        getCTPODisplayStatus(request) || 'PENDING',
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`ctpo-requests-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <DashboardLayout>

      <div className="ctpo-history-page">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="ctpo-history-header">

          <div className="ctpo-history-title-row">
            <div>
              <h1>
                All Requests
              </h1>

              <p>
                View and review all permission requests.
              </p>
            </div>
          </div>


          <div className="ctpo-header-actions">
            <Button
              type="button"
              className="ctpo-export-button"
              onClick={handleExport}
            >
              <LuDownload size={17} />
              Export PDF
            </Button>
          </div>

        </div>


        {/* ==================================================
            STATUS TABS
        ================================================== */}

        <div className="ctpo-history-tabs">

          <Button
            type="button"
            className={
              activeStatus === 'ALL'
                ? 'ctpo-history-tab active'
                : 'ctpo-history-tab'
            }
            onClick={() =>
              handleStatusChange('ALL')
            }
          >
            <LuClipboardList size={18} />

            <span>
              All Requests
              <strong>
                ({allCount})
              </strong>
            </span>
          </Button>


          <Button
            type="button"
            className={
              activeStatus === 'APPROVED'
                ? 'ctpo-history-tab active'
                : 'ctpo-history-tab'
            }
            onClick={() =>
              handleStatusChange(
                'APPROVED'
              )
            }
          >
            <LuCircleCheck size={18} />

            <span>
              Approved
              <strong>
                ({approvedCount})
              </strong>
            </span>
          </Button>


          <Button
            type="button"
            className={
              activeStatus === 'REJECTED'
                ? 'ctpo-history-tab active'
                : 'ctpo-history-tab'
            }
            onClick={() =>
              handleStatusChange(
                'REJECTED'
              )
            }
          >
            <LuCircleX size={18} />

            <span>
              Rejected
              <strong>
                ({rejectedCount})
              </strong>
            </span>
          </Button>


          {/* PENDING */}

          <Button
            type="button"
            className="ctpo-history-tab pending-tab"
            onClick={() =>
              navigate('/ctpo/pending')
            }
          >
            <LuClock size={18} />

            <span>
              Pending Requests
              <strong>
                ({pendingCount})
              </strong>
            </span>
          </Button>

        </div>


        {/* ==================================================
            SEARCH + FILTERS
        ================================================== */}

        <div className="ctpo-search-filter-card">

          <div className="ctpo-search-box">

            <LuSearch
              size={19}
              className="ctpo-search-icon"
            />

            <Input
              type="text"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Search student, roll number, company or details..."
            />

          </div>


          <Select
            className="ctpo-filter-select"
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger className="ctpo-filter-select"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Types</SelectItem><SelectItem value="Out-Pass">Out-Pass</SelectItem><SelectItem value="Mess Fee">Mess Fee</SelectItem><SelectItem value="Internship">Internship</SelectItem><SelectItem value="Library">Library</SelectItem></SelectContent>
          </Select>


          <Select
            className="ctpo-filter-select"
            value={timeFilter}
            onValueChange={setTimeFilter}
          >
            <SelectTrigger className="ctpo-filter-select"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Time</SelectItem><SelectItem value="TODAY">Today</SelectItem><SelectItem value="WEEK">This Week</SelectItem><SelectItem value="MONTH">This Month</SelectItem></SelectContent>
          </Select>

        </div>


        {/* ==================================================
            COUNT SUMMARY
        ================================================== */}

        


        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="ctpo-history-card">

          {loading && (
            <div className="ctpo-history-state">
              Loading all requests...
            </div>
          )}


          {!loading && error && (
            <div className="ctpo-history-state error">

              <FileText size={36} />

              <p>
                {error}
              </p>

              <Button
                type="button"
                onClick={loadRequests}
              >
                Retry
              </Button>

            </div>
          )}


          {!loading &&
            !error &&
            filteredRequests.length === 0 && (
              <div className="ctpo-history-state">

                <ClipboardList size={40} />

                <h3>
                  No Requests Found
                </h3>

                <p>
                  No requests match the selected filters.
                </p>

              </div>
            )}


          {!loading &&
            !error &&
            filteredRequests.length > 0 && (

              <div className="ctpo-table-wrapper">

                <Table className="ctpo-history-table">

                  <thead>

                    <tr>

                      <th>
                        REQUEST TYPE
                      </th>

                      <th>
                        STUDENT
                      </th>

                      <th>
                        DETAILS
                      </th>

                      <th>
                        SUBMITTED
                      </th>

                      <th>
                        CTPO STATUS
                      </th>

                      <th>
                        ACTION
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredRequests.map(
                      (
                        request,
                        index
                      ) => (

                        <tr
                          key={
                            request._id ||
                            `request-${index}`
                          }
                        >

                          {/* REQUEST TYPE */}

                          <td data-label="Type">

                            <div className="ctpo-request-type">

                              <LuFileText
                                size={17}
                              />

                              <span>
                                {
                                  request._permissionType
                                }
                              </span>

                            </div>

                          </td>


                          {/* STUDENT */}

                          <td data-label="Student">

                            <div className="ctpo-student-info">

                              <strong>
                                {
                                  request._studentName
                                }
                              </strong>

                              <span>
                                {
                                  request._rollNo
                                }
                              </span>

                            </div>

                          </td>


                          {/* DETAILS */}

                          <td data-label="Details">

                            <div
                              className="ctpo-request-details"
                              title={
                                request?.reason ||
                                request?.purpose ||
                                request?.description ||
                                request?.details ||
                                '-'
                              }
                            >
                              {
                                request?.reason ||
                                request?.purpose ||
                                request?.description ||
                                request?.details ||
                                '-'
                              }
                            </div>

                          </td>


                          {/* SUBMITTED */}

                          <td data-label="Submitted">

                            {
                              formatDate(
                                request?.createdAt ||
                                request?.submittedAt ||
                                request?.createdDate ||
                                request?.requestDate
                              )
                            }

                          </td>


                          {/* STATUS */}

                          <td data-label="Status">

                            <StatusBadge
                              status={
                                getCTPODisplayStatus(
                                  request
                                )
                              }
                            />

                          </td>


                          {/* ACTION */}

                          <td data-label="Action">

                            <Button
                              type="button"
                              className="ctpo-view-button"
                              onClick={() =>
                                handleViewRequest(
                                  request
                                )
                              }
                            >

                              <LuEye
                                size={16}
                              />

                              Review

                            </Button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </Table>

              </div>
            )}

        </div>

      </div>


      {/* ====================================================
          STYLES
      ==================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .ctpo-history-page {
          width: 100%;
          max-width: 100%;
          padding: 30px 32px 40px;
          margin: 0;
          color: #0f172a;
        }

        /* HEADER - matches the Student Requests reference */
        .ctpo-history-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .ctpo-history-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: 29px;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .ctpo-history-header p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 400;
        }

        /* HEADER ACTIONS */
        .ctpo-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ctpo-action-button,
        .ctpo-export-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          padding: 0 16px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }

        .ctpo-action-button {
          background: #ffffff;
          border: 1px solid #dbe3ef;
          color: #334155;
        }

        .ctpo-export-button {
          background: #2563eb;
          border: 1px solid #2563eb;
          color: #ffffff;
        }

        .ctpo-action-button:hover {
          background: #f8fafc;
        }

        .ctpo-export-button:hover {
          background: #1d4ed8;
        }

        /* STATUS TABS - flat layout like Student Requests */
        .ctpo-history-tabs {
          display: flex;
          align-items: stretch;
          gap: 0;
          flex-wrap: nowrap;
          width: 100%;
          margin-bottom: 18px;
          border-bottom: 1px solid #e2e8f0;
        }

        .ctpo-history-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          padding: 0 22px;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: #334155;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }

        .ctpo-history-tab:hover {
          background: #f8fafc;
          color: #2563eb;
        }

        .ctpo-history-tab.active {
          background: #eff6ff;
          color: #2563eb;
        }

        .ctpo-history-tab.active::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 2px;
          background: #2563eb;
        }

        .ctpo-history-tab strong {
          font-weight: 700;
          margin-left: 1px;
        }

        .ctpo-history-tab.pending-tab,
        .ctpo-history-tab.pending-tab:hover {
          margin-left: 0;
          color: #334155;
          background: transparent;
          border-color: transparent;
        }

        /* SEARCH + FILTERS - one clean outer container */
        .ctpo-search-filter-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0;
          background: #ffffff;
          border: 1px solid #dbe3ef;
          border-radius: 12px;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .ctpo-search-box {
          position: relative;
          flex: 1;
          min-width: 0;
          border-right: 1px solid #e8edf5;
        }

        .ctpo-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        /* Inner input: borderless — the outer card provides the single border */
        .ctpo-search-box input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 44px;
          border: none;
          border-radius: 0;
          outline: none;
          background: transparent;
          color: #334155;
          font-size: 13px;
          font-weight: 400;
        }

        .ctpo-search-box input::placeholder {
          color: #94a3b8;
          opacity: 1;
        }

        .ctpo-search-box input:focus {
          background: #f8faff;
          box-shadow: none;
        }

        .ctpo-filter-select {
          height: 44px;
          padding: 0 14px;
          min-width: 145px;
          border: none;
          border-left: 1px solid #e8edf5;
          border-radius: 0;
          background: #ffffff;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          flex-shrink: 0;
        }

        .ctpo-filter-select:focus {
          background: #f8faff;
        }

        /* TABLE CARD */
        .ctpo-history-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #dbe3ef;
          border-radius: 14px;
          overflow: hidden;
        }

        .ctpo-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .ctpo-history-table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .ctpo-history-table th {
          padding: 13px 16px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          text-align: left;
          font-size: 11px;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .ctpo-history-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          color: #475569;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 400;
          vertical-align: middle;
        }

        .ctpo-history-table tbody tr:hover {
          background: #f8fafc;
        }

        .ctpo-history-table tbody tr:last-child td {
          border-bottom: none;
        }

        /* COLUMN ORIENTATION / WIDTHS */
        .ctpo-history-table th:nth-child(1),
        .ctpo-history-table td:nth-child(1) {
          width: 16%;
        }

        .ctpo-history-table th:nth-child(2),
        .ctpo-history-table td:nth-child(2) {
          width: 23%;
        }

        .ctpo-history-table th:nth-child(3),
        .ctpo-history-table td:nth-child(3) {
          width: 19%;
        }

        .ctpo-history-table th:nth-child(4),
        .ctpo-history-table td:nth-child(4) {
          width: 14%;
        }

        .ctpo-history-table th:nth-child(5),
        .ctpo-history-table td:nth-child(5) {
          width: 16%;
        }

        .ctpo-history-table th:nth-child(6),
        .ctpo-history-table td:nth-child(6) {
          width: 12%;
        }

        /* REQUEST TYPE */
        .ctpo-request-type {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .ctpo-request-type svg {
          flex: 0 0 auto;
          color: #475569;
        }

        /* STUDENT */
        .ctpo-student-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .ctpo-student-info strong {
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.25;
          white-space: normal;
        }

        .ctpo-student-info span {
          color: #64748b;
          font-size: 12px;
          font-weight: 400;
        }

        /* DETAILS */
        .ctpo-request-details {
          max-width: 100%;
          color: #64748b;
          font-size: 12px;
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* REVIEW */
        .ctpo-view-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 36px;
          padding: 0 13px;
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          background: #ffffff;
          color: #2563eb;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .ctpo-view-button:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }

        /* REJECTED BADGE — scoped to CTPO All Requests only */
        .ctpo-history-page .badge-rejected {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        /* STATES */
        .ctpo-history-state {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #64748b;
          text-align: center;
        }

        .ctpo-history-state h3 {
          margin: 0;
          color: #334155;
          font-weight: 600;
        }

        .ctpo-history-state p {
          margin: 0;
          font-weight: 400;
        }

        .ctpo-history-state.error {
          color: #dc2626;
        }

        .ctpo-history-state.error button {
          padding: 9px 18px;
          border: none;
          border-radius: 8px;
          background: #2563eb;
          color: #ffffff;
          cursor: pointer;
          font-weight: 600;
        }

        /* RESPONSIVE */
        @media (max-width: 1100px) {
          .ctpo-history-page {
            padding: 24px;
          }

          .ctpo-search-filter-card {
            flex-wrap: wrap;
          }

          /* Search occupies full top row */
          .ctpo-search-box {
            flex-basis: 100%;
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e8edf5;
          }

          /* Dropdowns share the bottom row */
          .ctpo-filter-select {
            flex: 1;
            border-left: none;
            border-top: 1px solid #e8edf5;
          }

          .ctpo-filter-select:first-of-type {
            border-left: none;
          }
        }

        @media (max-width: 800px) {
          .ctpo-history-header {
            flex-direction: column;
          }

          .ctpo-history-title-row {
            width: 100%;
          }

          .ctpo-header-actions {
            width: 100%;
          }

          .ctpo-action-button,
          .ctpo-export-button {
            flex: 1;
          }

          .ctpo-history-tabs {
            overflow-x: auto;
          }

          .ctpo-history-tab {
            flex: 0 0 auto;
            min-width: 135px;
          }

          .ctpo-history-tab.pending-tab {
            margin-left: 0;
          }
        }

        @media (max-width: 600px) {
          .ctpo-history-page {
            padding: 16px 12px 30px;
          }

          .ctpo-history-header h1 {
            font-size: 22px;
          }

          .ctpo-history-title-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .ctpo-history-tabs {
            width: 100%;
          }

          .ctpo-history-tab {
            min-width: 110px;
            padding: 0 10px;
            font-size: 11px;
          }

          .ctpo-search-filter-card {
            flex-direction: column;
            align-items: stretch;
          }

          .ctpo-search-box {
            border-right: none;
            border-bottom: 1px solid #e8edf5;
          }

          .ctpo-filter-select {
            width: 100%;
            min-width: unset;
            flex: none;
            border-left: none;
            border-top: 1px solid #e8edf5;
          }

          /* Mobile card layout — replaces horizontal table scroll */
          .ctpo-table-wrapper {
            overflow-x: visible;
          }

          .ctpo-history-table {
            display: block;
            min-width: unset;
          }

          .ctpo-history-table thead {
            display: none;
          }

          .ctpo-history-table tbody {
            display: block;
          }

          .ctpo-history-table tbody tr {
            display: block;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            background: #fff;
          }

          .ctpo-history-table td {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            padding: 5px 0;
            border-bottom: none;
            font-size: 12px;
          }

          .ctpo-history-table td::before {
            content: attr(data-label);
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            flex-shrink: 0;
            width: 80px;
            padding-top: 1px;
          }

          .ctpo-history-table td:last-child {
            border-top: 1px solid #f1f5f9;
            margin-top: 4px;
            padding-top: 10px;
          }

          .ctpo-student-info strong,
          .ctpo-student-info span {
            white-space: normal;
          }
        }

        @media print {
          .ctpo-header-actions,
          .ctpo-history-tabs,
          .ctpo-search-filter-card {
            display: none !important;
          }

          .ctpo-history-page {
            padding: 0;
          }

          .ctpo-history-card {
            border: 1px solid #ddd;
          }
        }
`}</style>

    </DashboardLayout>
  );
}