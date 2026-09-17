import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = Cookies.get('token');
      const res = await axios.get('http://localhost:5000/api/outpass/pending/for-me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const token = Cookies.get('token');
      await axios.post(`http://localhost:5000/api/outpass/${id}/${action}`, { remarks: 'Processed via dashboard' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to process request');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="card header">
        <div>
          <h1 className="header-title">Staff Dashboard ({user?.role})</h1>
          <p className="header-subtitle">Welcome back, {user?.name}</p>
        </div>
        <button onClick={logout} className="btn btn-danger-outline">
          Logout
        </button>
      </div>

      <div className="card">
        <h2 className="header-title" style={{ marginBottom: '20px' }}>Pending Requests</h2>
        {loading ? (
          <p className="header-subtitle">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="header-subtitle">No pending requests to review.</p>
        ) : (
          <div>
            {requests.map((req) => (
              <div key={req._id} className="list-item">
                <div className="list-item-content">
                  <h3>{req.studentId?.name || 'Student'} - {req.studentId?.rollNo || 'N/A'}</h3>
                  <p style={{ margin: '8px 0', color: '#fff' }}>{req.reason}</p>
                  <p>Out: {format(new Date(req.outDate), 'MMM dd, yyyy')} at {req.outTime}</p>
                </div>
                <div className="actions">
                  <button onClick={() => handleAction(req._id, 'approve')} className="btn btn-success">
                    Approve
                  </button>
                  <button onClick={() => handleAction(req._id, 'reject')} className="btn btn-danger">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
