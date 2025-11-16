
import React, { useState } from 'react';
import { TrendingUp, Upload, FileText, Calendar, Package, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import predictionService from '../services/predictionService.js';

const PredictionsWidget = ({ predictions, onUploadSuccess }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadError(null);
    } else {
      setUploadError('Please select a valid CSV file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      
      const result = await predictionService.uploadPredictionData(selectedFile);
      
      setShowUploadModal(false);
      setSelectedFile(null);
      
      // Trigger refresh to get new predictions
      if (onUploadSuccess) {
        await onUploadSuccess();
      }
      
      alert('Prediction data uploaded successfully! Dashboard refreshed.');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadError(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <>
      <div className="predictions-widget-clean">
        <div className="widget-header-clean">
          <h3>AI Demand Predictions</h3>
          <button 
            className="widget-upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} />
            Upload Data
          </button>
        </div>
        
        <div className="predictions-list-clean">
          {predictions && predictions.length > 0 ? (
            predictions.map((prediction, index) => {
              const predictedDemand = prediction.Next_Predicted_Quantity ?? prediction.predicted_demand ?? 0;
              const reorderLevel = prediction.reorder_level ?? 0;
              const isBelowReorder = predictedDemand < reorderLevel;
              // Create a unique key
              const uniqueKey = prediction.prediction_id || `pred-${prediction.medicine_id}-${index}`;
              
              return (
                <div 
                  key={uniqueKey} 
                  className={`prediction-card-clean ${isBelowReorder ? 'below-reorder-alert' : ''}`}
                >
                  {/* Medicine Name */}
                  <div className="prediction-medicine-name">
                    {prediction.medicine_name || prediction.Product || `Medicine ID: ${prediction.medicine_id}`}
                  </div>

                  {/* Stats Row - Split into two rows for better spacing */}
                  <div className="prediction-stats-row">
                    <div className="stat-item-clean">
                      <div className="stat-icon-small">
                        <BarChart3 size={16} />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label-clean">Last Actual Quantity</span>
                        <span className="stat-value-clean">
                          {prediction.Last_Actual_Quantity ?? prediction.last_actual_quantity ?? 0} units
                        </span>
                      </div>
                    </div>

                    <div className="stat-divider-vertical"></div>

                    <div className="stat-item-clean">
                      <div className="stat-icon-small">
                        <Package size={16} />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label-clean">Predicted Demand</span>
                        <span className="stat-value-clean">
                          {prediction.Next_Predicted_Quantity ?? prediction.predicted_demand ?? 0} units
                        </span>
                      </div>
                    </div>

                    <div className="stat-divider-vertical"></div>

                    <div className="stat-item-clean">
                      <div className="stat-icon-small">
                        <TrendingUp size={16} />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label-clean">Reorder Level</span>
                        <span className="stat-value-clean">
                          {prediction.reorder_level ?? 0} units
                        </span>
                      </div>
                    </div>

                    <div className="stat-divider-vertical"></div>

                    <div className="stat-item-clean">
                      <div className="stat-icon-small">
                        <Calendar size={16} />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label-clean">Next Prediction Week</span>
                        <span className="stat-value-clean">
                          {formatDate(prediction.Next_Predicted_Week ?? prediction.prediction_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Second Stats Row - Demand Trend */}
                  <div className="prediction-stats-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    <div className="stat-item-clean">
                      <div className="stat-icon-small">
                        <Activity size={16} />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label-clean">Demand Trend</span>
                        <span className="stat-value-clean">
                          {prediction.demand_trend_summary ?? 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Below Reorder Alert - Only shows if below reorder */}
                  {isBelowReorder && (
                    <div className="below-reorder-banner">
                      <AlertTriangle size={16} />
                      <span>
                        Below reorder level by {reorderLevel - predictedDemand} units - 
                        Restocking required
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state-clean">
              <FileText size={40} />
              <p>No predictions available</p>
              <p className="empty-subtitle">Upload sales data to generate AI predictions</p>
              <button 
                className="btn-upload-empty"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload size={16} />
                Upload Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') closeModal();
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Upload Prediction Data</h3>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Upload a CSV file containing sales data. The AI will generate demand predictions and reorder levels.
              </p>
              
              <div className="file-upload-area">
                <Upload size={40} className="upload-icon" />
                <p>Select CSV file to upload</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  id="prediction-file-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="prediction-file-input" className="btn-select-file">
                  <FileText size={16} />
                  Choose File
                </label>
                
                {selectedFile && (
                  <div className="selected-file-info">
                    <FileText size={18} />
                    <div>
                      <span className="file-name">{selectedFile.name}</span>
                      <span className="file-size">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  </div>
                )}
                
                {uploadError && (
                  <div className="error-message">{uploadError}</div>
                )}
              </div>

              <div className="info-box-modal">
                <strong>CSV Format Requirements:</strong>
                <ul>
                  <li>Columns: medicine_id, quantity_sold, week_identifier</li>
                  <li>Date format: YYYY-MM-DD or YYYY-Wxx</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={closeModal}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Uploading...
                  </>
                ) : (
                  'Upload & Generate Predictions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PredictionsWidget;