import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://trustvault-oey4.onrender.com';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Checking...');
  const [selectedFile, setSelectedFile] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('docs');
  
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(res => res.json())
      .then(data => setStatus(data.status === 'active' ? 'Operational' : 'Online'))
      .catch(() => setStatus('Offline'));
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const docRes = await fetch(`${API_URL}/api/documents/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (docRes.ok) setDocuments(await docRes.json());

      // Optional: Fetch audit logs if your backend supports it
      const auditRes = await fetch(`${API_URL}/api/documents/audit/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (err) {
      console.error('Error fetching vault data', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setFeedback({ text: '', type: '' });

    if (isRegistering) {
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
          setFeedback({ text: 'Registration successful! Please log in.', type: 'success' });
          setIsRegistering(false);
        } else {
          setFeedback({ text: data.detail || 'Registration failed', type: 'error' });
        }
      } catch (err) {
        setFeedback({ text: 'An error occurred during registration.', type: 'error' });
      }
    } else {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      try {
        const response = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          setToken(data.access_token);
          localStorage.setItem('token', data.access_token);
        } else {
          setFeedback({ text: data.detail || 'Invalid username or password', type: 'error' });
        }
      } catch (err) {
        setFeedback({ text: 'An error occurred during authentication.', type: 'error' });
      }
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setDocuments([]);
    setAuditLogs([]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback({ text: 'Please choose a file first before uploading.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', selectedFile.name);
    formData.append('category', 'General');

    setFeedback({ text: 'Uploading (server may take up to 50s if waking up)...', type: 'success' });

    try {
      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setFeedback({ text: 'File securely ingested and logged to immutable audit trail.', type: 'success' });
        setSelectedFile(null);
        fetchData();
      } else {
        setFeedback({ text: typeof data.detail === 'string' ? data.detail : 'Upload failed', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Error executing file upload.', type: 'error' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Enterprise Header */}
      <nav style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', padding: '16px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', width: '38px', height: '38px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>🛡️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.01em' }}>TrustVault</h1>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secure Document Management & Audit System</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', border: '1px solid #334155' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status === 'Operational' ? '#10b981' : '#f59e0b' }}></span>
            <span style={{ color: '#cbd5e1' }}>System Status: <strong style={{ color: '#ffffff' }}>{status}</strong></span>
          </div>

          {token && (
            <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>
              Sign Out
            </button>
          )}
        </div>
      </nav>

      {/* Main Workspace */}
      <main style={{ maxWidth: '1140px', margin: '48px auto', padding: '0 24px' }}>
        
        {!token ? (
          /* Authentication Card */
          <div style={{ maxWidth: '420px', margin: '40px auto', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '700', color: '#ffffff' }}>
                {isRegistering ? 'Create Vault Account' : 'Welcome Back'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {isRegistering ? 'Register credentials to access secure vault' : 'Authenticate to access encrypted storage'}
              </p>
            </div>

            {feedback.text && (
              <div style={{ marginBottom: '20px', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${feedback.type === 'success' ? '#059669' : '#dc2626'}`, color: feedback.type === 'success' ? '#34d399' : '#f87171' }}>
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Enter username"
                  required 
                  style={{ width: '100%', padding: '11px 14px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                  style={{ width: '100%', padding: '11px 14px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" style={{ backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}>
                {isRegistering ? 'Register Account' : 'Authenticate Access'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsRegistering(!isRegistering); setFeedback({ text: '', type: '' }); }}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                >
                  {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register here'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Secure Vault Dashboard */
          <div>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Documents</span>
                <div style={{ fontSize: '32px', fontWeight: '700', marginTop: '8px', color: '#38bdf8' }}>{documents.length}</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Immutable Audits</span>
                <div style={{ fontSize: '32px', fontWeight: '700', marginTop: '8px', color: '#34d399' }}>{auditLogs.length}</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Protocol</span>
                <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '14px', color: '#a78bfa' }}>JWT + RBAC Active</div>
              </div>
            </div>

            {/* Document Ingestion Card */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '28px', marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>Ingest Secure File to Vault</h3>
              
              <form onSubmit={handleUpload} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  onChange={e => setSelectedFile(e.target.files[0])} 
                  style={{ backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#cbd5e1', fontSize: '13px', flex: '1', minWidth: '280px' }}
                />
                <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                  Upload Document
                </button>
              </form>

              {feedback.text && (
                <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${feedback.type === 'success' ? '#059669' : '#dc2626'}`, color: feedback.type === 'success' ? '#34d399' : '#f87171' }}>
                  {feedback.text}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: '24px', gap: '8px' }}>
              <button 
                onClick={() => setActiveTab('docs')}
                style={{ padding: '12px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === 'docs' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'docs' ? '#60a5fa' : '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Vault Documents ({documents.length})
              </button>
              <button 
                onClick={() => setActiveTab('audit')}
                style={{ padding: '12px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === 'audit' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'audit' ? '#60a5fa' : '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Immutable Audit Trail ({auditLogs.length})
              </button>
            </div>

            {/* Tables */}
            {activeTab === 'docs' ? (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
                {documents.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                    No files found in your vault. Upload your first document above.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <th style={{ padding: '16px 24px' }}>ID</th>
                        <th style={{ padding: '16px 24px' }}>Filename</th>
                        <th style={{ padding: '16px 24px' }}>Owner ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '16px 24px', color: '#94a3b8' }}>#{doc.id}</td>
                          <td style={{ padding: '16px 24px', fontWeight: '500', color: '#ffffff' }}>{doc.filename || doc.title}</td>
                          <td style={{ padding: '16px 24px', color: '#64748b' }}>User #{doc.owner_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
                {auditLogs.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                    No compliance audit entries recorded yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <th style={{ padding: '16px 24px' }}>Timestamp</th>
                        <th style={{ padding: '16px 24px' }}>Action Type</th>
                        <th style={{ padding: '16px 24px' }}>Audit Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px' }}>{new Date(log.timestamp || log.created_at).toLocaleString()}</td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', color: '#cbd5e1' }}>{log.details || log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;