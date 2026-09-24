import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  LuSearch,
  LuEye,
  LuFileText,
  LuCircleCheck,
  LuCircleX,
} from 'react-icons/lu';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table } from '../components/ui/table';

import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';

export default function CTPOPending() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search input value
  const [searchInput, setSearchInput] = useState('');

  // Actual applied search
  const [search, setSearch] = useState('');

  // Permission type filter
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // ============================================================
  // FETCH PENDING REQUESTS
  // ============================================================

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await api.get(
        '/outpass/pending/for-me'
      );

      console.log(
        'CTPO Pending API Response:',
        response?.data
      );

      const responseData = response?.data;

      let pendingRequests = [];

      if (Array.isArray(responseData)) {
        pendingRequests = responseData;
      } else if (Array.isArray(responseData?.data)) {
        pendingRequests = responseData.data;
      } else if (Array.isArray(responseData?.requests)) {
        pendingRequests = responseData.requests;
      } else if (
        Array.isArray(responseData?.data?.requests)
      ) {
        pendingRequests =
          responseData.data.requests;
      }

      console.log(
        'CTPO Pending Requests:',
        pendingRequests
      );

      setRequests(
        Array.isArray(pendingRequests)
          ? pendingRequests
          : []
      );
    } catch (error) {
      console.error(
        'Error fetching CTPO pending requests:',
        error
      );

      setRequests([]);

      setMessage(
        error?.response?.data?.message ||
          'Unable to load pending requests'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchPendingRequests();

    const interval = setInterval(() => {
      fetchPendingRequests();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // STUDENT NAME
  // ============================================================

  const getStudentName = (request) => {
    return (
      request?.studentId?.name ||
      request?.studentId?.profile?.fullName ||
      request?.student?.name ||
      request?.student?.profile?.fullName ||
      request?.studentName ||
      request?.user?.name ||
      request?.user?.profile?.fullName ||
      'Unknown Student'
    );
  };

  // ============================================================
  // ROLL NUMBER
  // ============================================================

  const getRollNumber = (request) => {
    return (
      request?.studentId?.rollNo ||
      request?.studentId?.rollNumber ||
      request?.student?.rollNo ||
      request?.student?.rollNumber ||
      request?.rollNo ||
      request?.rollNumber ||
      request?.user?.rollNo ||
      request?.user?.rollNumber ||
      '—'
    );
  };

  // ============================================================
  // BRANCH
  // ============================================================

  const getBranch = (request) => {
    return (
      request?.branchId?.name ||
      request?.branchId?.code ||
      request?.studentId?.branch?.name ||
      request?.studentId?.branch?.code ||
      request?.student?.branch?.name ||
      request?.student?.branch?.code ||
      request?.branch?.name ||
      request?.branch?.code ||
      request?.branch ||
      ''
    );
  };

  // ============================================================
  // PERMISSION TYPE
  // ============================================================

  const getPermissionType = (request) => {
    const type =
      request?.permissionType ||
      request?.requestType ||
      request?.type ||
      request?.permission?.type ||
      request?.permissionTypeId?.name ||
      request?.permissionTypeId?.type ||
      '';

    if (
      typeof type === 'object' &&
      type !== null
    ) {
      return (
        type?.name ||
        type?.label ||
        type?.type ||
        ''
      );
    }

    return type || 'Permission';
  };

  // ============================================================
  // PERMISSION TYPE LABEL
  // ============================================================

  const getPermissionTypeLabel = (request) => {
    const rawType = String(
      getPermissionType(request)
    ).trim();

    const type = rawType.toUpperCase();

    if (
      type.includes('OUTPASS') ||
      type.includes('OUT-PASS') ||
      type.includes('OUT_PASS') ||
      type.includes('OUT PASS')
    ) {
      return 'Out-Pass';
    }

    if (type.includes('MESS')) {
      return 'Mess Fee';
    }

    if (type.includes('INTERNSHIP')) {
      return 'Internship';
    }

    if (type.includes('LIBRARY')) {
      return 'Library';
    }

    return rawType || 'Permission';
  };

  // ============================================================
  // PURPOSE
  // ============================================================

  const getPurpose = (request) => {
    return (
      request?.purpose ||
      request?.reason ||
      request?.description ||
      request?.requestData?.purpose ||
      request?.formData?.purpose ||
      '—'
    );
  };

  // ============================================================
  // DATE
  // ============================================================

  const getDate = (request) => {
    const date =
      request?.createdAt ||
      request?.submittedAt ||
      request?.dateSubmitted ||
      request?.createdDate;

    if (!date) {
      return '—';
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return String(date);
    }

    return parsedDate.toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // ============================================================
  // SEARCH BUTTON
  // ============================================================

  const handleSearch = () => {
    setSearch(
      searchInput.trim()
    );
  };

  // ============================================================
  // ENTER KEY SEARCH
  // ============================================================

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

  // ============================================================
  // SEARCH INPUT
  // ============================================================

  const handleSearchInputChange = (event) => {
    const value =
      event.target.value;

    setSearchInput(value);

    if (!value.trim()) {
      setSearch('');
    }
  };

  // ============================================================
  // FILTER + SEARCH
  // ============================================================

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // ----------------------------------------------------------
    // TYPE FILTER
    // ----------------------------------------------------------

    if (typeFilter !== 'ALL') {
      result = result.filter(
        (request) => {
          const type = String(
            getPermissionType(request)
          ).toUpperCase();

          switch (typeFilter) {
            case 'OUT-PASS':
              return (
                type.includes('OUTPASS') ||
                type.includes('OUT-PASS') ||
                type.includes('OUT_PASS') ||
                type.includes('OUT PASS')
              );

            case 'MESS':
              return type.includes(
                'MESS'
              );

            case 'INTERNSHIP':
              return type.includes(
                'INTERNSHIP'
              );

            case 'LIBRARY':
              return type.includes(
                'LIBRARY'
              );

            default:
              return true;
          }
        }
      );
    }

    // ----------------------------------------------------------
    // SEARCH
    // ----------------------------------------------------------

    const searchValue =
      search.trim().toLowerCase();

    if (searchValue) {
      result = result.filter(
        (request) => {
          const studentName =
            getStudentName(
              request
            );

          const rollNumber =
            getRollNumber(
              request
            );

          const permissionType =
            getPermissionTypeLabel(
              request
            );

          const purpose =
            getPurpose(
              request
            );

          return (
            String(studentName)
              .toLowerCase()
              .includes(
                searchValue
              ) ||

            String(rollNumber)
              .toLowerCase()
              .includes(
                searchValue
              ) ||

            String(permissionType)
              .toLowerCase()
              .includes(
                searchValue
              ) ||

            String(purpose)
              .toLowerCase()
              .includes(
                searchValue
              )
          );
        }
      );
    }

    return result;
  }, [
    requests,
    search,
    typeFilter,
  ]);

  // ============================================================
  // VIEW REQUEST
  // ============================================================

  const handleView = (request) => {
    const id =
      request?._id ||
      request?.id ||
      request?.requestId;

    if (!id) {
      setMessage(
        'Request ID not found'
      );
      return;
    }

    navigate(
      `/outpass/${id}?mode=approval`
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <DashboardLayout>

      <div className="ctpo-pending-page">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="ctpo-page-header">

          <div className="ctpo-pending-title-row">
            <div>
              <h1>
                Pending Requests
              </h1>

              <p>
                Requests waiting for your approval
              </p>
            </div>
          </div>

        </div>

        {/* ======================================================
            SEARCH + FILTER BAR
        ====================================================== */}

        <div
          className="ctpo-filter-bar"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >

          {/* ==================================================
              SEARCH BOX
          ================================================== */}

          <div
            className="ctpo-search-box"
            style={{
              position: 'relative',
              flex: '1 1 auto',
              minWidth: 0,
              width: '100%',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0,
            }}
          >

            {/* LEFT SEARCH ICON REMOVED */}

            <Input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchInput}
              onChange={
                handleSearchInputChange
              }
              onKeyDown={
                handleSearchKeyDown
              }
              className="pr-12 h-12"
            />

            {/* RIGHT SEARCH BUTTON */}

            <Button
              type="button"
              onClick={handleSearch}
              title="Search"
              aria-label="Search"
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9"
            >
              <LuSearch size={19} />
            </Button>

          </div>

          {/* ==================================================
              TYPE FILTERS
          ================================================== */}

          <div
            className="ctpo-type-filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >

            {[
              {
                value: 'ALL',
                label: 'All Types',
              },
              {
                value: 'OUT-PASS',
                label: 'Out-Pass',
              },
              {
                value: 'MESS',
                label: 'Mess Fee',
              },
              {
                value: 'INTERNSHIP',
                label: 'Internship',
              },
              {
                value: 'LIBRARY',
                label: 'Library',
              },
            ].map(
              (filter) => (

                <Button
                  key={
                    filter.value
                  }
                  type="button"
                  className={
                    typeFilter ===
                    filter.value
                      ? 'h-12 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'h-12 px-5 rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                  onClick={() =>
                    setTypeFilter(
                      filter.value
                    )
                  }
                >
                  {filter.label}
                </Button>

              )
            )}

          </div>

        </div>

        {/* ======================================================
            FEEDBACK & MESSAGES
        ====================================================== */}

        {feedback.text && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
              border: feedback.type === 'error' ? '1px solid #fecaca' : '1px solid #a7f3d0',
              color: feedback.type === 'error' ? '#991b1b' : '#065f46',
            }}
          >
            {feedback.type === 'error' ? <LuCircleX size={18} /> : <LuCircleCheck size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {message && (
          <div className="ctpo-message">
            {message}
          </div>
        )}

        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="ctpo-table-card">

          {/* LOADING */}

          {loading ? (

            <div className="ctpo-loading">
              Loading pending requests...
            </div>

          ) : filteredRequests.length === 0 ? (

            <div className="ctpo-empty-state">

              <div className="ctpo-empty-icon">
                <LuCircleCheck size={42} />
              </div>

              <h2>
                All caught up!
              </h2>

              <p>
                No requests are currently
                pending in your queue.
              </p>

            </div>

          ) : (

            <div className="ctpo-table-wrapper">

              <Table className="ctpo-request-table">

                <thead>

                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Roll No.</th>
                    <th>Permission Type</th>
                    <th>Purpose</th>
                    <th>Date Submitted</th>
                    <th>Actions</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredRequests.map(
                    (request, index) => {

                      const id =
                        request?._id ||
                        request?.id ||
                        request?.requestId;

                      const studentName =
                        getStudentName(
                          request
                        );

                      const rollNumber =
                        getRollNumber(
                          request
                        );

                      const branch =
                        getBranch(
                          request
                        );

                      const permissionType =
                        getPermissionTypeLabel(
                          request
                        );

                      const purpose =
                        getPurpose(
                          request
                        );

                      const date =
                        getDate(
                          request
                        );

                      const isBusy = actionLoadingId === id;

                      return (

                        <tr
                          key={
                            id ||
                            `${studentName}-${index}`
                          }
                        >

                          {/* NUMBER */}

                          <td data-label="#">
                            {index + 1}
                          </td>

                          {/* STUDENT */}

                          <td data-label="Student">

                            <div className="ctpo-student-name">
                              {studentName}
                            </div>

                            {branch && (
                              <div className="ctpo-student-branch">
                                {branch}
                              </div>
                            )}

                          </td>

                          {/* ROLL NUMBER */}

                          <td data-label="Roll No">
                            {rollNumber}
                          </td>

                          {/* PERMISSION TYPE */}

                          <td data-label="Type">

                            <span className="ctpo-type-badge">

                              <LuFileText
                                size={14}
                              />

                              {permissionType}

                            </span>

                          </td>

                          {/* PURPOSE */}

                          <td data-label="Purpose">
                            {purpose}
                          </td>

                          {/* DATE */}

                          <td data-label="Date">
                            {date}
                          </td>

                          {/* ACTIONS */}

                          <td data-label="Action">

                            <div
                              className="ctpo-actions"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap',
                              }}
                            >

                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() =>
                                  handleView(
                                    request
                                  )
                                }
                                title="View Details"
                              >
                                <LuEye
                                  size={15}
                                />
                                View
                              </Button>
                            </div>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </Table>

            </div>

          )}

        </div>

      </div>

    </DashboardLayout>
  );
}
