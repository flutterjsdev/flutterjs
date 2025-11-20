import 'package:dev_tools/src/html_scripts_pannel.dart';

import 'html_styles.dart';
import 'html_scripts.dart';

class HtmlGenerator {
  static String generate() => HtmlLayout.generate();
}

class HtmlLayout {
  static String generate() =>
      '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Binary IR Viewer - Progressive Analysis</title>
    <style>
        ${HtmlStyles.getStyles()}
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Binary IR Viewer - Progressive Analysis</h1>
        <p>Real-time Line-by-Line Analysis & Error Detection</p>
    </div>
    
    <div class="main-container">
        <!-- LEFT SECTION: FILES & UPLOAD -->
        <div class="section-left">
            <div class="panel-header">📁 FILES & UPLOAD</div>
            <div class="panel-content">
                <div class="upload-zone" id="uploadZone">
                    <div style="font-size: 36px; margin-bottom: 12px;">📤</div>
                     <div style="font-size: 13px;"><strong style="color: #42a5f5;">Click or drag</strong> to upload</div>
                  <div style="font-size: 11px; color: #999; margin-top: 8px;">*.ir files only</div>
                <input type="file" id="fileInput" accept=".ir" style="display: none;">
                </div>
                
                <div id="uploadMessage"></div>
                
                <!-- ERROR PANEL - PERSISTENT UNTIL NEW UPLOAD -->
                <div class="error-panel" id="errorPanel">
                    <div class="error-header">
                        <div class="error-title">
                            ❌ ERRORS DETECTED
                            <span class="error-count-badge" id="errorCount">0</span>
                        </div>
                        <button class="error-close-btn" onclick="clearErrorPanel()" title="Clear errors">×</button>
                    </div>
                    <div class="error-details" id="errorDetails"></div>
                </div>
                <div class="panel-content" id="analysisPanel">
                <div class="empty-state">
                    <div style="font-size: 32px; margin-bottom: 12px;">📄</div>
                    <div>Upload a file to begin analysis</div>
                </div>
            </div>
              
            </div>
        </div>
        
        <!-- RIGHT SECTION: PROGRESSIVE ANALYSIS -->
        <div class="section-right">
            <div class="panel-header">
                <span>📄 FILE ANALYSIS</span>
                <span class="progress-indicator" id="progressIndicator">Ready</span>
            </div>
              
                <!-- DIAGNOSTIC BOX -->
                <div class="diagnostic-box" id="diagnosticBox" style="display:none;">
                    <div class="diagnostic-title">📋 ANALYSIS STATUS</div>
                    <div id="diagnosticItems"></div>
                </div>
        </div>
    </div>
    
    <script>
        ${HtmlScripts.getScripts()}
        ${HtmlScriptsPannel.getHtmlPannelScript()}
    </script>
</body>
</html>
''';
}
