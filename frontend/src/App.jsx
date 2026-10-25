
import React, { useState, useEffect, useCallback } from 'react';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://trustvault-oey4.onrender.com'
).replace(/\/+$/, '');

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  );

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Checking...');
  const [selectedFile, setSelectedFile] = useState(null);
  const [feedback, setFeedback] = useState({
    text: '',
    type: '',
  });
  const [activeTab, setActiveTab] = useState('docs');
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [fileInputKey, setFileInputKey] = useState(0);

  // Safely read API responses, including non-JSON errors.
  const readResponse = async (response) => {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { detail: text };
    }
  };

  const getErrorMessage = (data, fallback) => {
    if (typeof data?.detail === 'string') {
      return data.detail;
    }

    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item) => item.msg || JSON.stringify(item))
        .join(', ');
    }

    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }

    return fallback;
  };

  // Check whether the deployed backend is reachable.
  useEffect(() => {
    let cancelled = false;

    const checkServer = async () => {
      try {
        const response = await fetch(`${API_URL}/`);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        if (!cancelled) {
          setStatus('Online');
        }
      } catch (error) {
        console.error('Backend health check failed:', error);

        if (!cancelled) {
          setStatus('Offline');
        }
      }
    };

    checkServer();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoadingData(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [docResponse, auditResponse] = await Promise.all([
        fetch(`${API_URL}/api/documents/`, { headers }),
        fetch(`${API_URL}/api/audit/`, { headers }),
      ]);

      if (
        docResponse.status === 401 ||
        auditResponse.status === 401
      ) {
        setFeedback({
          text: 'Your session may have expired. Please sign in again.',
          type: 'error',
        });
      }

      if (docResponse.ok) {
        const docData = await readResponse(docResponse);

        setDocuments(
          Array.isArray(docData)
            ? docData
            : Array.isArray(docData.documents)
              ? docData.documents
              : []
        );
      } else {
        const errorData = await readResponse(docResponse);

        console.error(
          'Document list failed:',
          docResponse.status,
          errorData
        );
      }

      if (auditResponse.ok) {
        const auditData = await readResponse(auditResponse);

        setAuditLogs(
          Array.isArray(auditData)
            ? auditData
            : Array.isArray(auditData.logs)
              ? auditData.logs
              : []
        );
      } else {
        const errorData = await readResponse(auditResponse);

        console.error(
          'Audit list failed:',
          auditResponse.status,
          errorData
        );
      }
    } catch (error) {
      console.error('Error fetching vault data:', error);

      setFeedback({
        text: 'Could not load vault data. Check your network and backend.',
        type: 'error',
      });
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setDocuments([]);
      setAuditLogs([]);
    }
  }, [token, fetchData]);

  const handleAuth = async (event) => {
    event.preventDefault();

    setFeedback({ text: '', type: '' });

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setFeedback({
        text: 'Enter both username and password.',
        type: 'error',
      });
      return;
    }

    try {
      let response;

      if (isRegistering) {
        response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
        });
      } else {
        const formData = new URLSearchParams();
        formData.append('username', cleanUsername);
        formData.append('password', password);

        response = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });
      }

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Request failed (${response.status})`)
        );
      }

      if (isRegistering) {
        setFeedback({
          text: 'Registration successful. Please sign in.',
          type: 'success',
        });

        setIsRegistering(false);
        setPassword('');
      } else {
        if (!data.access_token) {
          throw new Error(
            'Login response did not contain an access token.'
          );
        }

        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setPassword('');

        setFeedback({
          text: 'Login successful.',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Authentication failed:', error);

      setFeedback({
        text: error.message || 'Authentication failed. Please try again.',
        type: 'error',
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUsername('');
    setPassword('');
    setSelectedFile(null);
    setFileInputKey((key) => key + 1);
    setDocuments([]);
    setAuditLogs([]);
    setFeedback({
      text: 'You have signed out.',
      type: 'success',
    });
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!token) {
      setFeedback({
        text: 'Please sign in before uploading.',
        type: 'error',
      });
      return;
    }

    if (!selectedFile) {
      setFeedback({
        text: 'Please select a file before uploading.',
        type: 'error',
      });
      return;
    }

    // Keep this limit consistent with your backend configuration.
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFeedback({
        text: 'File is too large. Maximum allowed size here is 10 MB.',
        type: 'error',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', selectedFile.name);
    formData.append('category', 'General');

    setUploading(true);
    setFeedback({
      text: 'Uploading document...',
      type: 'success',
    });

    try {
      const response = await fetch(
        `${API_URL}/api/documents/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          setFeedback({
            text: 'Your session is invalid or expired. Please sign in again.',
            type: 'error',
          });
          return;
        }

        if (response.status === 403) {
          setFeedback({
            text: getErrorMessage(
              data,
              'Your account does not have permission to upload. Check your assigned role.'
            ),
            type: 'error',
          });
          return;
        }

        if (response.status === 413) {
          setFeedback({
            text: 'The server rejected the file because it is too large.',
            type: 'error',
          });
          return;
        }

        if (response.status === 422) {
          setFeedback({
            text: `Upload fields were rejected: ${getErrorMessage(
              data,
              'Check the title, category, and file fields.'
            )}`,
            type: 'error',
          });
          return;
        }

        throw new Error(
          getErrorMessage(data, `Upload failed (${response.status})`)
        );
      }

      setFeedback({
        text: data.message || 'Document uploaded successfully.',
        type: 'success',
      });

      setSelectedFile(null);
      setFileInputKey((key) => key + 1);

      await fetchData();
    } catch (error) {
      console.error('Document upload failed:', error);

      setFeedback({
        text: `Upload error: ${
          error.message || 'Could not reach the backend.'
        }`,
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const cardStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '24px',
  };

  const buttonStyle = {
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: uploading ? 'wait' : 'pointer',
    opacity: uploading ? 0.7 : 1,
  };

  const feedbackStyle = {
    marginTop: '16px',
    padding: '12px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    overflowWrap: 'anywhere',
    backgroundColor:
      feedback.type === 'success'
        ? 'rgba(16,185,129,0.1)'
        : 'rgba(239,68,68,0.1)',
    border: `1px solid ${
      feedback.type === 'success' ? '#059669' : '#dc2626'
    }`,
    color: feedback.type === 'success' ? '#34d399' : '#f87171',
  };

  const cellStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid #1e293b',
    overflowWrap: 'anywhere',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f1f5f9',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <nav
        style={{
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 'bold',
              fontSize: '18px',
            }}
          >
            🛡️
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                color: '#ffffff',
              }}
            >
              TrustVault
            </h1>
            <span
              style={{
                fontSize: '11px',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              Secure Document Management &amp; Audit System
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              color: status === 'Offline' ? '#f87171' : '#cbd5e1',
            }}
          >
            ● {status}
          </span>

          {token && (
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>

      <main
        style={{
          maxWidth: '1140px',
          margin: '32px auto',
          padding: '0 20px',
        }}
      >
        {feedback.text && !token && (
          <div style={feedbackStyle} role="status">
            {feedback.text}
          </div>
        )}

        {!token ? (
          <div
            style={{
              ...cardStyle,
              maxWidth: '420px',
              margin: '40px auto',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: '0 0 8px', color: '#ffffff' }}>
                {isRegistering ? 'Create Vault Account' : 'Welcome Back'}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                {isRegistering
                  ? 'Register to access the secure vault'
                  : 'Sign in to access your documents'}
              </p>
            </div>

            <form
              onSubmit={handleAuth}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <label style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Username
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '6px',
                    padding: '12px',
                    backgroundColor: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
              </label>

              <label style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Password
                <input
                  type="password"
                  autoComplete={
                    isRegistering ? 'new-password' : 'current-password'
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '6px',
                    padding: '12px',
                    backgroundColor: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
              </label>

              <button
                type="submit"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {isRegistering ? 'Register Account' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegistering((value) => !value);
                  setFeedback({ text: '', type: '' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                {isRegistering
                  ? 'Already registered? Sign in'
                  : 'Need an account? Register'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div style={cardStyle}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  VISIBLE DOCUMENTS
                </span>
                <div
                  style={{
                    fontSize: '32px',
                    color: '#38bdf8',
                    marginTop: '8px',
                  }}
                >
                  {documents.length}
                </div>
              </div>

              <div style={cardStyle}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  AUDIT ENTRIES
                </span>
                <div
                  style={{
                    fontSize: '32px',
                    color: '#34d399',
                    marginTop: '8px',
                  }}
                >
                  {auditLogs.length}
                </div>
              </div>

              <div style={cardStyle}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  SECURITY
                </span>
                <div
                  style={{
                    fontSize: '18px',
                    color: '#a78bfa',
                    marginTop: '14px',
                  }}
                >
                  JWT + RBAC
                </div>
              </div>
            </div>

            <section style={{ ...cardStyle, marginBottom: '28px' }}>
              <h3 style={{ marginTop: 0 }}>Upload Document to Vault</h3>

              <form
                onSubmit={handleUpload}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  key={fileInputKey}
                  type="file"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                  disabled={uploading}
                  style={{
                    flex: '1',
                    minWidth: '0',
                    maxWidth: '100%',
                    color: '#cbd5e1',
                  }}
                />

                <button
                  type="submit"
                  disabled={uploading}
                  style={buttonStyle}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>

              {feedback.text && (
                <div style={feedbackStyle} role="status">
                  {feedback.text}
                </div>
              )}

              <p
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginBottom: 0,
                }}
              >
                Maximum file size in this interface: 10 MB. The server must
                enforce its own file size and file type validation too.
              </p>
            </section>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid #1e293b',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === 'docs'
                      ? '2px solid #3b82f6'
                      : '2px solid transparent',
                  color: activeTab === 'docs' ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Vault Documents ({documents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === 'audit'
                      ? '2px solid #3b82f6'
                      : '2px solid transparent',
                  color: activeTab === 'audit' ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Audit Trail ({auditLogs.length})
              </button>

              <button
                type="button"
                onClick={fetchData}
                disabled={loadingData}
                style={{
                  marginLeft: 'auto',
                  padding: '10px 14px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {loadingData ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <section
              style={{
                ...cardStyle,
                padding: '0',
                overflowX: 'auto',
              }}
            >
              {activeTab === 'docs' ? (
                documents.length === 0 ? (
                  <div
                    style={{
                      padding: '44px 20px',
                      textAlign: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    {loadingData
                      ? 'Loading documents...'
                      : 'No documents available for this account.'}
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '13px',
                    }}
                  >
                    <thead>
                      <tr style={{ color: '#94a3b8' }}>
                        <th style={cellStyle}>ID</th>
                        <th style={cellStyle}>Document</th>
                        <th style={cellStyle}>Category</th>
                        <th style={cellStyle}>Owner ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc, index) => (
                        <tr key={doc.id ?? index}>
                          <td style={cellStyle}>{doc.id ?? '—'}</td>
                          <td style={cellStyle}>
                            {doc.title || doc.filename || 'Untitled'}
                          </td>
                          <td style={cellStyle}>{doc.category || '—'}</td>
                          <td style={cellStyle}>{doc.owner_id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : auditLogs.length === 0 ? (
                <div
                  style={{
                    padding: '44px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  {loadingData
                    ? 'Loading audit entries...'
                    : 'No audit entries available for this account.'}
                </div>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr style={{ color: '#94a3b8' }}>
                      <th style={cellStyle}>Timestamp</th>
                      <th style={cellStyle}>Action</th>
                      <th style={cellStyle}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, index) => (
                      <tr key={log.id ?? index}>
                        <td style={cellStyle}>
                          {(() => {
                            const timestamp =
                              log.timestamp || log.created_at;

                            if (!timestamp) return '—';

                            const date = new Date(timestamp);

                            return Number.isNaN(date.getTime())
                              ? String(timestamp)
                              : date.toLocaleString();
                          })()}
                        </td>
                        <td style={cellStyle}>{log.action || '—'}</td>
                        <td style={cellStyle}>
                          {log.details ||
                            log.description ||
                            log.outcome ||
                            '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
