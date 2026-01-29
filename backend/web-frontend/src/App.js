import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Token submission logic
  const handleTokenSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      setShowTokenInput(false);
      localStorage.setItem('apiToken', token.trim());
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('apiToken');
    if (savedToken) {
      setToken(savedToken);
      setShowTokenInput(false);
    }
  }, []);

  const uploadFile = async () => {
    if (!file || !token) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/upload/', formData, {
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSummary(res.data);
      fetchHistory();
    } catch (error) {
      alert('❌ Backend error! Check token & backend running');
      console.error(error);
    }
    setLoading(false);
  };

  // ✅ NEW PDF EXPORT FUNCTION
 const exportPDF = () => {
    if (!summary) return;
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Header & Branding
    doc.setFillColor(44, 62, 80); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("CHEMICAL EQUIPMENT REPORT", 20, 25);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${timestamp}`, 140, 32);

    // 2. Summary Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("Analysis Overview", 20, 55);
    doc.setFontSize(12);
    doc.text(`Total Equipment Items: ${summary.total_count}`, 20, 65);
    doc.line(20, 70, 190, 70);

    // 3. Add the Chart Image
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const chartImg = canvas.toDataURL('image/png', 1.0);
      doc.addImage(chartImg, 'PNG', 15, 80, 180, 90);
    }

    // 4. NEW: Raw JSON Data Section (Starts on a new page)
    doc.addPage();
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(16);
    doc.text("Raw Analysis Data (JSON)", 20, 20);
    doc.line(20, 25, 190, 25);

    // Format JSON string
    const jsonString = JSON.stringify(summary, null, 2);
    
    // Set to Monospaced font for code look
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    // Split text to fit page width and handle pagination
    const splitText = doc.splitTextToSize(jsonString, 170);
    let yPos = 35;
    const margin = 20;

    splitText.forEach((line) => {
      if (yPos > pageHeight - margin) {
        doc.addPage();
        yPos = margin; // Reset y position for new page
      }
      doc.text(line, 20, yPos);
      yPos += 5; // Line height
    });

    // 5. Footer (Added to all pages logic usually goes here, but for simplicity:)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("End of Report - System Generated JSON Export", 20, yPos + 10);

    doc.save(`Chemical_Full_Report_${Date.now()}.pdf`);
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/history/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      setHistory(res.data);
    } catch (error) {
      console.log('Backend not running or wrong token');
    }
  };

  useEffect(() => {
    if (token && !showTokenInput) {
      fetchHistory();
    }
  }, [token, showTokenInput]);

  const chartData = summary ? {
    labels: summary.type_distribution ? Object.keys(summary.type_distribution) : [],
    datasets: [{
      label: 'Equipment Count',
      data: summary.type_distribution ? Object.values(summary.type_distribution) : [],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  } : null;

  if (showTokenInput) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', padding: '20px' }}>
        <h1 style={{ fontSize: '2.5em', marginBottom: '30px' }}>🧪 Equipment Visualizer</h1>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '20px', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <h2 style={{ marginBottom: '20px' }}>🔐 API Authentication</h2>
          <form onSubmit={handleTokenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password"
              placeholder="Enter Django Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{ padding: '15px', fontSize: '16px', border: 'none', borderRadius: '10px', outline: 'none' }}
            />
            <button type="submit" disabled={!token.trim()} style={{ padding: '15px', fontSize: '16px', border: 'none', borderRadius: '10px', background: token.trim() ? '#4CAF50' : '#888', color: 'white', cursor: 'pointer' }}>
              Connect
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>🧪 Chemical Visualizer</h1>
        <div>
          <button onClick={() => setShowTokenInput(true)} style={{ padding: '10px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}>
            Authenticate
          </button>
          {summary && (
            <button onClick={exportPDF} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              📄 Export PDF
            </button>
          )}
        </div>
      </header>

      <section style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0 }}>📤 New Analysis</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
          <button onClick={uploadFile} disabled={loading || !file} style={{ padding: '12px 30px', background: loading || !file ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {loading ? 'Processing...' : 'Analyze Data'}
          </button>
        </div>
      </section>

      {summary && (
        <section id="report-area" style={{ marginTop: '30px', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📊 Analysis Summary</h3>
            <span style={{ padding: '5px 15px', background: '#e9ecef', borderRadius: '20px', fontSize: '14px' }}>
              Items: {summary.total_count}
            </span>
          </div>
          
          {chartData && (
            <div style={{ height: '400px', margin: '30px 0' }}>
              <Bar 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } }
                }} 
              />
            </div>
          )}

          <details style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Raw JSON Data</summary>
            <pre style={{ marginTop: '15px', fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(summary, null, 2)}
            </pre>
          </details>
        </section>
      )}

      <section style={{ marginTop: '30px' }}>
        <h3>📋 Recent Uploads</h3>
        {history.map((item, index) => (
          <div key={index} style={{ padding: '15px', background: 'white', border: '1px solid #eee', marginBottom: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>📄 {item.name}</span>
            <span style={{ color: '#666' }}>{item.summary?.total_count || 0} items detected</span>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;