// Vercel Speed Insights Initialization
// This script initializes Vercel Speed Insights for tracking web vitals

(function() {
  'use strict';
  
  // Initialize the Speed Insights queue
  window.si = window.si || function() {
    (window.siq = window.siq || []).push(arguments);
  };
  
  // Load the Speed Insights script
  var script = document.createElement('script');
  script.defer = true;
  script.src = 'https://va.vercel-scripts.com/v1/speed-insights/script.js';
  
  // Append script to head
  document.head.appendChild(script);
})();
