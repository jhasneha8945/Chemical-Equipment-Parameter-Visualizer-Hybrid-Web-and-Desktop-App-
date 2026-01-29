import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QPushButton, QFileDialog, 
                             QLabel, QVBoxLayout, QWidget, QListWidget, QTextEdit,
                             QDialog, QLineEdit, QMessageBox)
from PyQt5.QtCore import QThread, pyqtSignal
import requests
import matplotlib
matplotlib.use('Agg')  # FIX: Non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import json
from datetime import datetime

class TokenDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle('🔐 Enter API Token')
        self.setFixedSize(450, 150)
        
        layout = QVBoxLayout()
        layout.addWidget(QLabel('Paste your Django token (sneha):'))
        
        self.token_input = QLineEdit()
        self.token_input.setPlaceholderText('9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b...')
        self.token_input.setEchoMode(QLineEdit.Password)
        
        connect_btn = QPushButton('✅ Connect to Backend')
        connect_btn.clicked.connect(self.accept)
        
        layout.addWidget(self.token_input)
        layout.addWidget(connect_btn)
        self.setLayout(layout)
    
    def get_token(self):
        if self.exec_() == QDialog.Accepted:
            return self.token_input.text().strip()
        return None

class Worker(QThread):
    summary_signal = pyqtSignal(dict)
    
    def __init__(self, file_path, token):
        super().__init__()
        self.file_path = file_path
        self.token = token
    
    def run(self):
        try:
            headers = {'Authorization': f'Token {self.token}'}
            with open(self.file_path, 'rb') as f:
                files = {'file': f}
                res = requests.post('http://127.0.0.1:8000/api/upload/', 
                                  headers=headers, files=files)
                if res.status_code == 201:
                    self.summary_signal.emit(res.json())
        except:
            pass

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.token = None
        self.current_summary = None
        self.get_token()
        
        if not self.token:
            sys.exit("❌ Token required!")
            
        self.setWindowTitle('Chemical Equipment Visualizer - Desktop')
        self.setGeometry(100, 100, 1000, 700)
        
        # Layout
        layout = QVBoxLayout()
        self.btn_upload = QPushButton('📁 Upload CSV File')
        self.btn_history = QPushButton('🔄 Refresh History')
        self.btn_pdf = QPushButton('📄 Export PDF Report')
        self.btn_pdf.setEnabled(False)
        
        self.list_history = QListWidget()
        self.text_summary = QTextEdit()
        self.text_summary.setMaximumHeight(150)
        self.figure = Figure()
        self.canvas = FigureCanvas(self.figure)
        
        # Connect buttons
        self.btn_upload.clicked.connect(self.upload_csv)
        self.btn_history.clicked.connect(self.load_history)
        self.btn_pdf.clicked.connect(self.export_pdf)
        
        # Add to layout
        layout.addWidget(QLabel(f'✅ Connected: {self.token[:20]}...'))
        layout.addWidget(self.btn_upload)
        layout.addWidget(self.btn_history)
        layout.addWidget(self.btn_pdf)
        layout.addWidget(QLabel('📋 Recent Uploads:'))
        layout.addWidget(self.list_history)
        layout.addWidget(QLabel('📊 Summary:'))
        layout.addWidget(self.text_summary)
        layout.addWidget(self.canvas)
        
        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)
        
        self.load_history()

    def get_token(self):
        dialog = TokenDialog(self)
        self.token = dialog.get_token()

    def upload_csv(self):
        file, _ = QFileDialog.getOpenFileName(self, 'Select CSV File', '', 'CSV Files (*.csv)')
        if file:
            self.worker = Worker(file, self.token)
            self.worker.summary_signal.connect(self.on_upload_complete)
            self.worker.start()

    def on_upload_complete(self, summary):
        self.current_summary = summary
        self.text_summary.setText(json.dumps(summary, indent=2))
        self.plot_chart(summary)
        self.load_history()
        self.btn_pdf.setEnabled(True)

    def load_history(self):
        try:
            headers = {'Authorization': f'Token {self.token}'}
            res = requests.get('http://127.0.0.1:8000/api/history/', headers=headers)
            history = res.json()
            self.list_history.clear()
            for h in history:
                self.list_history.addItem(f"{h['name']}: {h['summary']['total_count']} items")
        except:
            self.list_history.addItem("❌ Backend not running")

    def plot_chart(self, summary):
        self.figure.clear()
        ax = self.figure.add_subplot(111)
        
        if 'type_distribution' in summary:
            types = list(summary['type_distribution'].keys())
            counts = list(summary['type_distribution'].values())
            ax.bar(types, counts, color='skyblue')
            ax.set_title('Equipment Type Distribution')
            ax.set_ylabel('Count')
        
        self.figure.tight_layout()
        self.canvas.draw()

    def export_pdf(self):
        """PDF with Header, Statistics, Chart, and Raw JSON Data"""
        if not self.current_summary:
            QMessageBox.warning(self, "No Data", "Upload CSV first!")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdf_filename = f"Chemical_Report_{timestamp}.pdf"
        
        try:
            # Create a figure with a larger height to accommodate three sections
            fig = plt.figure(figsize=(8.5, 14))
            
            # 1. TOP SECTION: Text Summary
            ax0 = fig.add_axes([0.1, 0.75, 0.8, 0.2]) # [left, bottom, width, height]
            ax0.axis('off')
            ax0.text(0.5, 0.95, 'CHEMICAL EQUIPMENT ANALYSIS REPORT', 
                    fontsize=22, fontweight='bold', ha='center', va='top')
            
            total = self.current_summary.get('total_count', 0)
            ax0.text(0.5, 0.75, f'TOTAL EQUIPMENT: {total}', 
                    fontsize=26, fontweight='bold', ha='center', color='#1a5276')
            
            ax0.text(0.5, 0.60, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 
                    fontsize=10, ha='center', style='italic')

            if 'type_distribution' in self.current_summary:
                ax0.text(0, 0.45, 'EQUIPMENT BREAKDOWN:', fontsize=14, fontweight='bold')
                y_offset = 0.35
                for name, count in self.current_summary['type_distribution'].items():
                    ax0.text(0.02, y_offset, f'• {name}: {count}', fontsize=12)
                    y_offset -= 0.08
                    if y_offset < 0: break # Prevent overflow into chart area

            # 2. MIDDLE SECTION: The Chart
            ax1 = fig.add_axes([0.1, 0.35, 0.8, 0.3])
            if 'type_distribution' in self.current_summary:
                types = list(self.current_summary['type_distribution'].keys())
                counts = list(self.current_summary['type_distribution'].values())
                bars = ax1.bar(types, counts, color='#5dade2', edgecolor='#2e86c1')
                ax1.set_title('DISTRIBUTION VISUALIZATION', fontsize=16, fontweight='bold', pad=15)
                ax1.set_ylabel('Count')
                # Add count labels on top of bars
                for bar in bars:
                    yval = bar.get_height()
                    ax1.text(bar.get_x() + bar.get_width()/2, yval + 0.1, yval, ha='center', va='bottom')

            # 3. BOTTOM SECTION: Raw JSON Data
            ax2 = fig.add_axes([0.1, 0.05, 0.8, 0.25])
            ax2.axis('off')
            ax2.text(0, 0.95, 'RAW ANALYSIS DATA (JSON):', fontsize=12, fontweight='bold', color='gray')
            
            # Formatting JSON for display
            json_text = json.dumps(self.current_summary, indent=2)
            # Use a monospaced font for the JSON block
            ax2.text(0, 0.90, json_text, fontsize=8, family='monospace', verticalalignment='top', 
                    bbox=dict(boxstyle='round', facecolor='#f4f6f7', alpha=0.5))

            # Save and Close
            fig.savefig(pdf_filename, format='pdf', dpi=150)
            plt.close(fig)
            
            QMessageBox.information(self, "✅ SUCCESS!", f"PDF SAVED:\n{pdf_filename}")
            
        except Exception as e:
            QMessageBox.critical(self, "ERROR", f"Failed to generate PDF:\n{str(e)}")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
