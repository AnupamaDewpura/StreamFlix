import { useState, useEffect } from 'react';
import api from '../utils/api';

const TABS = ['Streams', 'Categories', 'Source Sites'];

export default function Admin() {
  const [mirrors, setMirrors] = useState({});         // mirrors per stream id
  const [expandedStream, setExpandedStream] = useState(null); // which stream is expanded
  const [newMirror, setNewMirror] = useState({ label: '', url: '' });
  const [token, setToken] = useState(localStorage.getItem('sf_admin_token'));
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('Streams');
  const [streams, setStreams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [editingStream, setEditingStream] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [newStream, setNewStream] = useState({
    title: '', description: '', thumbnail_url: '', stream_url: '',
    source_website: '', category_id: '', is_live: 1, is_featured: 0, sort_order: 0
  });
  const [newSource, setNewSource] = useState({ name: '', base_url: '', channels_path: '/24-7-channels.php', channel_selector: 'a[href*="stream"]', description: '' });
  const [newCategory, setNewCategory] = useState({ name: '', sort_order: 0 });

  useEffect(() => { if (token) loadAll(); }, [token]);

  const loadAll = async () => {
    try {
      const [streamsRes, categoriesRes, sourcesRes] = await Promise.all([
        api.get('/admin/streams'),
        api.get('/admin/categories'),
        api.get('/admin/sources')
      ]);
      setStreams(streamsRes.data);
      setCategories(categoriesRes.data);
      setSources(sourcesRes.data);

      // Refresh mirrors for whichever stream is currently expanded
      if (expandedStream) {
        const mirrorsRes = await api.get(`/admin/streams/${expandedStream}/mirrors`);
        setMirrors(prev => ({ ...prev, [expandedStream]: mirrorsRes.data }));
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const loadMirrors = async (streamId) => {
    const res = await api.get(`/admin/streams/${streamId}/mirrors`);
    setMirrors(prev => ({ ...prev, [streamId]: res.data }));
  };

  const toggleMirrors = (streamId) => {
    if (expandedStream === streamId) {
      setExpandedStream(null);
    } else {
      setExpandedStream(streamId);
      loadMirrors(streamId);
    }
  };

  const addMirror = async (streamId) => {
    if (!newMirror.label || !newMirror.url) { alert('Label and URL are required'); return; }
    await api.post(`/admin/streams/${streamId}/mirrors`, newMirror);
    setNewMirror({ label: '', url: '' });
    await loadMirrors(streamId);
  };

  const deleteMirror = async (mirrorId, streamId) => {
    if (window.confirm('Delete this mirror?')) {
      await api.delete(`/admin/mirrors/${mirrorId}`);
      await loadMirrors(streamId);
    }
  };

  const login = async () => {
    try {
      const res = await api.post('/auth/login', loginForm);
      localStorage.setItem('sf_admin_token', res.data.token);
      setToken(res.data.token);
      setLoginError('');
    } catch {
      setLoginError('Wrong username or password. Try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('sf_admin_token');
    setToken(null);
  };

  const createStream = async () => {
    if (!newStream.title || !newStream.stream_url) {
      alert('Title and Stream URL are required!');
      return;
    }
    await api.post('/admin/streams', newStream);
    setNewStream({ title: '', description: '', thumbnail_url: '', stream_url: '', source_website: '', category_id: '', is_live: 1, is_featured: 0, sort_order: 0 });
    await loadAll();
    alert('Stream added!');
  };

  const updateStream = async (s) => {
    await api.put(`/admin/streams/${s.id}`, s);
    await loadAll();
    setEditingStream(null);
  };

  const deleteStream = async (id) => {
    if (window.confirm('Are you sure you want to delete this stream?')) {
      await api.delete(`/admin/streams/${id}`);
      await loadAll();
    }
  };

  const createSource = async () => {
    await api.post('/admin/sources', newSource);
    setNewSource({ name: '', base_url: '', channels_path: '/24-7-channels.php', channel_selector: 'a[href*="stream"]', description: '' });
    await loadAll();
  };

  const updateSource = async (s) => {
    await api.put(`/admin/sources/${s.id}`, s);
    await loadAll();
    setEditingSource(null);
  };

  const deleteSource = async (id) => {
    if (window.confirm('Delete this source site?')) {
      await api.delete(`/admin/sources/${id}`);
      await loadAll();
    }
  };

  const createCategory = async () => {
    if (!newCategory.name) { alert('Category name is required!'); return; }
    await api.post('/admin/categories', newCategory);
    setNewCategory({ name: '', sort_order: 0 });
    await loadAll();
  };

  const deleteCategory = async (id) => {
    if (window.confirm('Delete this category?')) {
      await api.delete(`/admin/categories/${id}`);
      await loadAll();
    }
  };

  const triggerSync = async () => {
    if (!window.confirm('Sync stream URLs from all active source sites? This may take a minute.')) return;
    try {
      await api.post('/admin/sync-all');
      alert('Sync started! Check your backend terminal for progress. Refresh in a minute.');
    } catch {
      alert('Sync failed. Check your backend is running.');
    }
  };

  const triggerSyncSite = async (siteId, siteName) => {
    if (!window.confirm(`Sync streams from ${siteName} only?`)) return;
    try {
      await api.post(`/admin/sync-site/${siteId}`);
      alert(`Sync started for ${siteName}! Check your backend terminal.`);
    } catch {
      alert('Sync failed. Check your backend is running.');
    }
  };

  const inputCls = "bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 w-full";
  const btnCls = "px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer";

  // ===== LOGIN SCREEN =====
  if (!token) return (
    <div className="min-h-screen bg-netflix-dark flex items-center justify-center">
      <div className="bg-black/80 p-12 rounded-xl w-full max-w-md border border-gray-800">
        <h1 className="font-display text-5xl text-netflix-red mb-1">STREAMFLIX</h1>
        <p className="text-gray-500 text-sm mb-8">Admin Panel — Authorized Access Only</p>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Username</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))}
              className={inputCls}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Password</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && login()}
              className={inputCls}
              placeholder="Enter your password"
            />
          </div>
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button onClick={login} className={`${btnCls} bg-netflix-red hover:bg-red-700 text-white w-full py-3`}>
            Sign In
          </button>
        </div>

        <p className="text-gray-700 text-xs mt-6 text-center">
          Default credentials are shown in your backend terminal
        </p>
      </div>
    </div>
  );

  // ===== ADMIN DASHBOARD =====
  return (
    <div className="min-h-screen bg-netflix-dark text-white">
      {/* Top bar */}
      <div className="bg-black/80 px-8 py-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-4">
          <span className="font-display text-3xl text-netflix-red">STREAMFLIX</span>
          <span className="text-gray-600 text-xs border border-gray-700 px-2 py-0.5 rounded">Admin Panel</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">← View Site</a>
          <button onClick={triggerSync} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            ↻ Sync All Sites
          </button>
          <button onClick={logout} className="text-gray-500 hover:text-red-500 text-sm transition-colors">Sign Out</button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 px-8 pt-6 pb-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${btnCls} ${activeTab === tab ? 'bg-netflix-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-8 py-6">

        {/* ===== STREAMS TAB ===== */}
        {activeTab === 'Streams' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Manage Live Streams</h2>
              <span className="text-gray-500 text-sm">{streams.length} streams total</span>
            </div>

            {/* Add new stream form */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add New Stream</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Channel Title *</label>
                  <input className={inputCls} placeholder="e.g. ESPN Sports Live" value={newStream.title} onChange={e => setNewStream(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Stream URL * (the actual stream link)</label>
                  <input className={inputCls} placeholder="https://example.com/live.m3u8 or embed URL" value={newStream.stream_url} onChange={e => setNewStream(p => ({ ...p, stream_url: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Thumbnail Image URL</label>
                  <input className={inputCls} placeholder="https://example.com/thumbnail.jpg" value={newStream.thumbnail_url} onChange={e => setNewStream(p => ({ ...p, thumbnail_url: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Source Website (for your reference)</label>
                  <input className={inputCls} placeholder="example.com" value={newStream.source_website} onChange={e => setNewStream(p => ({ ...p, source_website: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Description</label>
                  <input className={inputCls} placeholder="Short description of this channel" value={newStream.description} onChange={e => setNewStream(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Category</label>
                  <select className={inputCls} value={newStream.category_id} onChange={e => setNewStream(p => ({ ...p, category_id: e.target.value }))}>
                    <option value="">Select a category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-6 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={!!newStream.is_live} onChange={e => setNewStream(p => ({ ...p, is_live: e.target.checked ? 1 : 0 }))} className="w-4 h-4" />
                    Show as Live
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={!!newStream.is_featured} onChange={e => setNewStream(p => ({ ...p, is_featured: e.target.checked ? 1 : 0 }))} className="w-4 h-4" />
                    Feature in Hero Banner
                  </label>
                </div>
              </div>
              <button onClick={createStream} className={`${btnCls} bg-netflix-red hover:bg-red-700 text-white mt-4 px-6`}>
                + Add Stream
              </button>
            </div>

            {/* Streams list */}
            <div className="space-y-2">
              {streams.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  No streams yet. Add your first one above!
                </div>
              )}
              {streams.map(stream => (
                <div key={stream.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  {editingStream?.id === stream.id ? (
                    // Editing mode
                    <div>
                      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Editing: {stream.title}</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input className={inputCls} value={editingStream.title} onChange={e => setEditingStream(p => ({ ...p, title: e.target.value }))} placeholder="Title" />
                        <input className={inputCls} value={editingStream.stream_url} onChange={e => setEditingStream(p => ({ ...p, stream_url: e.target.value }))} placeholder="Stream URL" />
                        <input className={inputCls} value={editingStream.thumbnail_url || ''} onChange={e => setEditingStream(p => ({ ...p, thumbnail_url: e.target.value }))} placeholder="Thumbnail URL" />
                        <input className={inputCls} value={editingStream.source_website || ''} onChange={e => setEditingStream(p => ({ ...p, source_website: e.target.value }))} placeholder="Source Website" />
                        <input className={inputCls} value={editingStream.description || ''} onChange={e => setEditingStream(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
                        <select className={inputCls} value={editingStream.category_id || ''} onChange={e => setEditingStream(p => ({ ...p, category_id: e.target.value }))}>
                          <option value="">No Category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => updateStream(editingStream)} className={`${btnCls} bg-green-700 hover:bg-green-600 text-white`}>Save Changes</button>
                        <button onClick={() => setEditingStream(null)} className={`${btnCls} bg-gray-700 hover:bg-gray-600 text-white`}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {stream.thumbnail_url && (
                          <img src={stream.thumbnail_url} alt="" className="w-20 h-12 object-cover rounded flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium">{stream.title}</span>
                            {!!stream.is_live && <span className="text-xs bg-red-600 px-1.5 py-0.5 rounded">LIVE</span>}
                            {!!stream.is_featured && <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded">FEATURED</span>}
                          </div>
                          <p className="text-gray-500 text-xs truncate max-w-md">{stream.stream_url}</p>
                          {stream.category_name && <p className="text-gray-600 text-xs mt-0.5">{stream.category_name}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => toggleMirrors(stream.id)} className={`${btnCls} bg-blue-900 hover:bg-blue-800 text-white`}>
                          {expandedStream === stream.id ? 'Hide Mirrors' : 'Mirrors'}
                        </button>
                        <button onClick={() => setEditingStream({ ...stream })} className={`${btnCls} bg-gray-700 hover:bg-gray-600 text-white`}>Edit</button>
                        <button onClick={() => deleteStream(stream.id)} className={`${btnCls} bg-red-900 hover:bg-red-800 text-white`}>Delete</button>
                      </div>
                    </div>
                  )}
                  {/* Mirror manager - expands below the stream card */}
                  {expandedStream === stream.id && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Mirror Sources for: {stream.title}</p>

                      {/* Existing mirrors */}
                      <div className="space-y-2 mb-4">
                        {(mirrors[stream.id] || []).length === 0 && (
                          <p className="text-gray-600 text-xs">No mirrors yet. The main stream URL is always used by default.</p>
                        )}
                        {(mirrors[stream.id] || []).map(mirror => (
                          <div key={mirror.id} className="flex items-center gap-3 bg-gray-800 rounded px-3 py-2">
                            <span className="text-xs font-bold text-blue-400 w-20 flex-shrink-0">{mirror.label}</span>
                            <span className="text-xs text-gray-400 truncate flex-1">{mirror.url}</span>
                            <button
                              onClick={() => deleteMirror(mirror.id, stream.id)}
                              className="text-red-500 hover:text-red-400 text-xs flex-shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add new mirror */}
                      <div className="flex gap-2">
                        <input
                          className={inputCls}
                          placeholder="Label (e.g. Mirror 1, HD, Backup)"
                          value={newMirror.label}
                          onChange={e => setNewMirror(p => ({ ...p, label: e.target.value }))}
                          style={{ maxWidth: '160px' }}
                        />
                        <input
                          className={inputCls}
                          placeholder="Stream URL"
                          value={newMirror.url}
                          onChange={e => setNewMirror(p => ({ ...p, url: e.target.value }))}
                        />
                        <button
                          onClick={() => addMirror(stream.id)}
                          className={`${btnCls} bg-blue-700 hover:bg-blue-600 text-white whitespace-nowrap`}
                        >
                          + Add Mirror
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CATEGORIES TAB ===== */}
        {activeTab === 'Categories' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Manage Categories</h2>
            <p className="text-gray-500 text-sm mb-6">Categories create rows on the homepage (like "Sports", "News", "Entertainment")</p>

            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Category</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input className={inputCls} placeholder="Category name (e.g. Sports)" value={newCategory.name} onChange={e => setNewCategory(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={{ width: '120px' }}>
                  <input className={inputCls} placeholder="Order" type="number" value={newCategory.sort_order} onChange={e => setNewCategory(p => ({ ...p, sort_order: +e.target.value }))} />
                </div>
                <button onClick={createCategory} className={`${btnCls} bg-netflix-red hover:bg-red-700 text-white whitespace-nowrap`}>+ Add</button>
              </div>
            </div>

            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-gray-600 text-xs ml-3">Sort order: {cat.sort_order}</span>
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className={`${btnCls} bg-red-900 hover:bg-red-800 text-white text-xs`}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SOURCE SITES TAB ===== */}
        {activeTab === 'Source Sites' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Source Website Manager</h2>
            <p className="text-gray-500 text-sm mb-6">
              This is your personal directory of streaming websites you use as sources.
              It's just a reference list — the actual stream URLs are set per-stream in the Streams tab.
            </p>

            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Source Website</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Site Name</label>
                  <input className={inputCls} placeholder="e.g. DaddyLive" value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Base URL</label>
                  <input className={inputCls} placeholder="https://daddylive.mp" value={newSource.base_url} onChange={e => setNewSource(p => ({ ...p, base_url: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">
                    Channels Page Path
                    <span className="text-gray-600 ml-2 font-normal">— the path to their channel list</span>
                  </label>
                  <input className={inputCls} placeholder="/24-7-channels.php" value={newSource.channels_path || ''} onChange={e => setNewSource(p => ({ ...p, channels_path: e.target.value }))} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">
                    Channel Link Selector
                    <span className="text-gray-600 ml-2 font-normal">— CSS selector for channel links</span>
                  </label>
                  <input className={inputCls} placeholder='a[href*="stream"]' value={newSource.channel_selector || ''} onChange={e => setNewSource(p => ({ ...p, channel_selector: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-500 text-xs mb-1 block">Notes</label>
                  <input className={inputCls} placeholder="Optional notes about this site" value={newSource.description} onChange={e => setNewSource(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <button onClick={createSource} className={`${btnCls} bg-netflix-red hover:bg-red-700 text-white mt-4`}>+ Add Source</button>
            </div>

            <div className="space-y-2">
              {sources.map(src => (
                <div key={src.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  {editingSource?.id === src.id ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Site Name</label>
                        <input className={inputCls} value={editingSource.name} onChange={e => setEditingSource(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Base URL</label>
                        <input className={inputCls} value={editingSource.base_url} onChange={e => setEditingSource(p => ({ ...p, base_url: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-gray-500 text-xs mb-1 block">Notes</label>
                        <input className={inputCls} value={editingSource.description || ''} onChange={e => setEditingSource(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateSource(editingSource)} className={`${btnCls} bg-green-700 text-white`}>Save</button>
                        <button onClick={() => setEditingSource(null)} className={`${btnCls} bg-gray-700 text-white`}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-medium">{src.name}</span>
                          <a href={src.base_url} target="_blank" rel="noreferrer" className="text-gray-500 text-sm hover:text-blue-400 transition-colors truncate">{src.base_url}</a>
                          {src.last_synced && (
                            <span className="text-gray-600 text-xs">Last synced: {new Date(src.last_synced).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                          <span>Path: <code className="text-gray-500">{src.channels_path}</code></span>
                          <span>Selector: <code className="text-gray-500">{src.channel_selector}</code></span>
                        </div>
                        {src.description && <p className="text-gray-600 text-xs mt-1">{src.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => triggerSyncSite(src.id, src.name)} className={`${btnCls} bg-blue-900 hover:bg-blue-800 text-white`}>↻ Sync</button>
                        <button onClick={() => setEditingSource({ ...src })} className={`${btnCls} bg-gray-700 hover:bg-gray-600 text-white`}>Edit</button>
                        <button onClick={() => deleteSource(src.id)} className={`${btnCls} bg-red-900 hover:bg-red-800 text-white`}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {sources.length === 0 && (
                <div className="text-center py-10 text-gray-600 text-sm">
                  No source sites added yet.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}