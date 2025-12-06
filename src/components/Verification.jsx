import React, { useState } from 'react';
import api from '../api';

export default function Verification() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!file) return setMessage('Please select a file');
    setLoading(true); setMessage('');
    try {
      const res = await api.uploadVerification(file);
      setMessage(res.ok ? `Uploaded: ${res.path}` : 'Upload failed');
    } catch (e) {
      setMessage(e.error || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">Upload Verification Documents</h2>
          <p className="text-sm text-gray-600 mb-4">Upload your government ID or professional credentials (PDF / JPG / PNG). Max 10MB.</p>

          <input type="file" onChange={(e)=>setFile(e.target.files[0])} />
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={submit} disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</button>
          </div>

          {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
