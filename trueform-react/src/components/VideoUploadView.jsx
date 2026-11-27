// src/components/VideoUploadView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { PoseCanvas } from './PoseCanvas.jsx';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_DURATION = 60;
const MIN_HEIGHT = 240;

export function VideoUploadView({
  videoRef,
  canvasRef,
  containerRef,
  isAnalyzing,
  formScore,
  coachingAdvice,
  analysisFinalized,
  activeCueText,
  startUploadAnalysis,
  resetUpload
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const inspectFile = (file) => {
    setFileError('');
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setFileError('Choose a video file (MP4, MOV, or WebM).');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('This video is larger than 50 MB. Choose a smaller clip.');
      return;
    }

    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const { duration, videoWidth, videoHeight } = probe;
      probe.removeAttribute('src');
      probe.load();
      if (!Number.isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        setFileError('We could not read this video. Try exporting it again.');
        return;
      }
      if (duration > MAX_DURATION) {
        URL.revokeObjectURL(url);
        setFileError('Keep clips to 60 seconds or less for reliable analysis.');
        return;
      }
      if (videoHeight < MIN_HEIGHT) {
        URL.revokeObjectURL(url);
        setFileError('Video resolution is too low. Use a clip at least 240p tall.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(url);
      setVideoAspectRatio(`${videoWidth} / ${videoHeight}`);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setFileError('This video could not be opened. Try another file.');
    };
    probe.src = url;
  };

  const handleFileChange = (event) => {
    inspectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleRemovePreview = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setVideoAspectRatio(null);
    setFileError('');
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) {
      setFileError('Add a video clip before starting the analysis.');
      return;
    }
    if (!skillInput.trim()) {
      setFileError('Enter the skill shown in your video (for example, handstand).');
      return;
    }
    setFileError('');
    startUploadAnalysis(selectedFile, skillInput.trim());
  };

  const handleNextVideo = () => {
    resetUpload();
    handleRemovePreview();
    setSkillInput('');
  };

  const showWorkspace = isAnalyzing || analysisFinalized;

  const handleDrop = (event) => {
    event.preventDefault();
    dropZoneRef.current?.classList.remove('is-dragging');
    inspectFile(event.dataTransfer.files?.[0]);
  };

  return (
    <section className="app-section" id="section-video">
      <div className="section-kicker"><span className="status-dot" /> COMPUTER VISION · VIDEO REVIEW</div>
      <h2 className="section-heading">Video analysis</h2>
      <p className="section-sub">
        Upload a short clip to get a form score, movement validation, and actionable coaching feedback.
      </p>

      <div className="upload-bar video-upload-shell" style={{ display: showWorkspace ? 'none' : 'block' }}>
        <div
          ref={dropZoneRef}
          className={`box upload-dropzone ${previewUrl ? 'has-preview' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            dropZoneRef.current?.classList.add('is-dragging');
          }}
          onDragLeave={() => dropZoneRef.current?.classList.remove('is-dragging')}
          onDrop={handleDrop}
        >
          {!previewUrl ? (
            <button
              type="button"
              className="upload-empty-state"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choose a video to analyze"
            >
              <span className="upload-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
                  <path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" />
                </svg>
              </span>
              <strong>Drop your training clip here</strong>
              <span>or browse files · MP4, MOV, WebM</span>
              <small>Maximum 50 MB · 60 seconds · 240p minimum</small>
            </button>
          ) : (
            <div className="upload-preview">
              <div className="thumbnail-wrapper">
                <video id="preview-video" src={previewUrl} muted playsInline controls />
                <button type="button" className="remove-btn" onClick={handleRemovePreview} aria-label="Remove selected video">
                  &times;
                </button>
              </div>
              <div className="selected-file-meta">
                <span className="file-check">✓</span>
                <span><strong>{selectedFile?.name}</strong><small>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready to analyze</small></span>
                <button type="button" className="text-btn" onClick={() => fileInputRef.current?.click()}>Replace</button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            id="hidden-video-input"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            hidden
            onChange={handleFileChange}
          />

          <div className="upload-form-row">
            <label className="sr-only" htmlFor="skill-input">Skill shown in video</label>
            <input
              type="text"
              id="skill-input"
              className="text2"
              placeholder="Skill (e.g. handstand, planche, push-up)"
              value={skillInput}
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isAnalyzing) handleStartAnalysis();
              }}
              autoComplete="off"
              disabled={isAnalyzing}
            />
            <button
              type="button"
              className="cta-btn primary analyze-btn"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || !selectedFile}
            >
              {isAnalyzing ? <><span className="button-spinner" /> Analyzing</> : 'Analyze video'}
              {!isAnalyzing && <span aria-hidden="true">↗</span>}
            </button>
          </div>
          {fileError && <p className="upload-error" role="alert">{fileError}</p>}
        </div>
        <div className="upload-tips">
          <span>01 · Keep your full body in frame</span>
          <span>02 · Record from a clear side angle</span>
          <span>03 · Use bright, even lighting</span>
        </div>
      </div>

      <div className="analysis-workspace" id="analysis-workspace" style={{ display: showWorkspace ? 'flex' : 'none' }}>
        {isAnalyzing && <div className="analysis-progress"><span className="button-spinner" /> Tracking landmarks and evaluating your movement…</div>}
        <PoseCanvas
          videoRef={videoRef}
          canvasRef={canvasRef}
          containerRef={containerRef}
          isLive={false}
          aspectRatio={videoAspectRatio}
        >
          {activeCueText && <div className="cue-badge">{activeCueText}</div>}
        </PoseCanvas>

        <div className="dashboard-row">
          <div className="data-card score-card">
            <span className="card-label">FORM SCORE</span>
            <div className="score-display">
              <span id="form-score-value">{formScore}</span>
              <span className="score-total">/100</span>
            </div>
            <span className="score-caption">Movement quality estimate</span>
          </div>
          <div className="data-card advice-card">
            <span className="card-label">COACHING INSIGHTS</span>
            <p id="coaching-advice">{coachingAdvice}</p>
          </div>
        </div>

        {analysisFinalized && (
          <button type="button" className="cta-btn primary next-video-btn" id="next-video-btn" onClick={handleNextVideo}>
            Analyze another clip <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
    </section>
  );
}
