import 'package:dev_tools/src/ir_view/html_scripts.dart';
import 'package:dev_tools/src/ir_view/html_scripts_left_panel.dart';
import 'package:dev_tools/src/ir_view/html_scripts_right_panel.dart';
import 'package:dev_tools/src/ir_view/html_scripts_utilities.dart';
import 'package:dev_tools/src/ir_view/html_styles.dart';
import 'package:dev_tools/src/ir_view/html_styles_left_panel.dart';
import 'package:dev_tools/src/ir_view/html_styles_right_panel.dart';
import 'package:dev_tools/src/json_view/html_scripts_json_reader.dart';
import 'package:dev_tools/src/json_view/html_styles_json_reader.dart';

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
        ${HtmlStylesLeftPanel.getHtmlStylesLeftPanel()}
        ${HtmlRightPannelStyles.getHtmlRightPannelStyles()}
        ${HtmlStylesJsonReader.getJsonReaderStyles()}
        
        /* TAB CONTAINER STYLES */
        .tab-container {
            background: white;
            padding: 0;
            margin: 0;
            border-radius: 0;
            box-shadow: none;
            overflow: hidden;
            flex-shrink: 0;
        }

        .tabs {
            display: flex;
            border-bottom: 2px solid #3f3f52;
            background: #2d2d40;
        }

        .tab-btn {
            flex: 0 1 auto;
            padding: 14px 24px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: #999;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }

        .tab-btn:hover {
            background: rgba(66, 165, 245, 0.1);
            color: #42a5f5;
        }

        .tab-btn.active {
            color: #42a5f5;
            border-bottom-color: #42a5f5;
            background: rgba(66, 165, 245, 0.08);
        }

        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
            flex: 1;
            overflow: hidden;
        }

        .tab-content.active {
            display: flex;
            flex-direction: column;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        body {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .header {
            flex-shrink: 0;
        }

        .tabs-and-content {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <!-- ✅ HIDDEN FILE INPUTS - Outside of click zones -->
    <input type="file" id="fileInput" accept=".ir" style="display: none; position: absolute; left: -9999px;">
    <input type="file" id="jsonFileInput" accept=".json" style="display: none; position: absolute; left: -9999px;">

    <div class="header">
        <h1>📊 Binary IR Viewer - Progressive Analysis</h1>
        <p>Real-time Line-by-Line Analysis & Error Detection</p>
    </div>
    
    <div class="tabs-and-content">
        <!-- TAB BUTTONS -->
        <div class="tab-container">
            <div class="tabs">
                <button class="tab-btn active" onclick="switchTab(event, 'ir-reader')">📄 IR Reader</button>
                <button class="tab-btn" onclick="switchTab(event, 'json-reader')">📋 JSON Report Reader</button>
                <button class="tab-btn" onclick="switchTab(event, 'coming-soon')">⭐ More Coming Soon</button>
            </div>
        </div>

        <!-- IR READER TAB -->
        <div id="ir-reader" class="tab-content active">
            <div class="main-container">
                <!-- LEFT SECTION -->
                <div class="section-left">
                    <div class="panel-header">📁 FILES & UPLOAD</div>
                    
                    <div class="left-scrollable">
                        <!-- UPLOAD ZONE -->
                        <div class="upload-zone" id="uploadZone">
                            <div style="font-size: 36px; margin-bottom: 12px;">📤</div>
                            <div style="font-size: 13px;"><strong style="color: #42a5f5;">Click or drag</strong> to upload</div>
                            <div style="font-size: 11px; color: #999; margin-top: 8px;">*.ir files only</div>
                        </div>
                        
                        <div id="uploadMessage"></div>
                        
                        <!-- ERROR PANEL -->
                        <div class="error-panel" id="errorPanel">
                            <div class="error-header">
                                <div class="error-title">
                                    ❌ ERRORS DETECTED
                                    <span class="error-count-badge" id="errorCount">0</span>
                                </div>
                                <button class="error-close-btn" onclick="clearErrorPanel()" title="Clear errors">✕</button>
                            </div>
                            <div class="error-details" id="errorDetails"></div>
                        </div>
                        
                        <!-- ANALYSIS STATUS -->
                        <div class="diagnostic-box" id="diagnosticBox" style="display:none;">
                            <div class="diagnostic-title">📋 ANALYSIS STATUS</div>
                            <div id="diagnosticItems"></div>
                        </div>
                        
                        <!-- PROGRESSIVE ANALYSIS LINES -->
                        <div class="analysis-content" id="analysisContent">
                            <div class="empty-state">
                                <div style="font-size: 14px;">Waiting for analysis...</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- RIGHT SECTION: Detail Cards Material 3 -->
                <div class="section-right">
                    <div class="panel-header">
                        <span>📄 FILE ANALYSIS</span>
                        <span class="progress-indicator" id="progressIndicator">Ready</span>
                    </div>
                    
                    <div class="right-scrollable" id="leftDetailsPanel">
                    </div>
                </div>
            </div>
        </div>

        <!-- JSON READER TAB -->
        <div id="json-reader" class="tab-content">
            <div class="main-container">
                <!-- LEFT SECTION - JSON UPLOAD -->
                <div class="section-left">
                    <div class="panel-header">📁 JSON UPLOAD</div>
                    
                    <div class="left-scrollable">
                        <!-- JSON UPLOAD ZONE -->
                        <div class="json-upload-zone" id="jsonUploadZone">
                            <div style="font-size: 36px; margin-bottom: 12px;">📤</div>
                            <div style="font-size: 13px;"><strong style="color: #42a5f5;">Click or drag</strong> to upload</div>
                            <div style="font-size: 11px; color: #999; margin-top: 8px;">*.json files only</div>
                        </div>
                        
                        <div id="jsonUploadMessage"></div>
                        
                        <!-- JSON FILE INFO -->
                        <div class="json-file-info" id="jsonFileInfo" style="display:none;">
                            <div class="json-info-header">📊 FILE INFO</div>
                            <div id="jsonFileDetails"></div>
                        </div>
                        
                        <!-- JSON STRUCTURE -->
                        <div class="json-structure-panel" id="jsonStructurePanel" style="display:none;">
                            <div class="json-structure-header">🏗️ STRUCTURE</div>
                            <div id="jsonStructure"></div>
                        </div>
                    </div>
                </div>
                
                <!-- RIGHT SECTION - JSON DISPLAY -->
                <div class="section-right">
                    <div class="panel-header">
                        <span>📋 JSON REPORT</span>
                        <span class="progress-indicator" id="jsonProgressIndicator">Ready</span>
                    </div>
                    
                    <div class="right-scrollable">
                        <div class="json-display-container" id="jsonDisplayContainer">
                            <div class="empty-state">
                                <div style="font-size: 14px;">Upload a JSON file to view report...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- COMING SOON TAB -->
        <div id="coming-soon" class="tab-content">
            <div class="main-container" style="align-items: center; justify-content: center;">
                <div class="coming-soon-placeholder">
                    <div style="font-size: 64px; margin-bottom: 20px;">🚀</div>
                    <div style="font-size: 24px; font-weight: 600; color: #42a5f5; margin-bottom: 10px;">More Tools Coming Soon</div>
                    <p style="color: #999; font-size: 14px;">We're working on additional features...</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        ${HtmlScriptsUtilities.getUtilitiesScript()}
        ${HtmlScriptsRightPanel.getRightPanelScript()}
        ${HtmlScripts.getScripts()}
        ${HtmlScriptsLeftPanel.getLeftPanelScript()}
        ${HtmlScriptsJsonReader.getJsonReaderScript()}
        
        // TAB SWITCHING FUNCTION
        function switchTab(event, tabName) {
            event.preventDefault();
            
            // Hide all tab contents
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.remove('active'));

            // Remove active class from all buttons
            const buttons = document.querySelectorAll('.tab-btn');
            buttons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab content
            const selectedTab = document.getElementById(tabName);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }

            // Add active class to clicked button
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
''';
}
