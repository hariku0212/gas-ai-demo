# GAS Templates Library

Production-ready Google Apps Script templates for business automation.
All templates follow security best practices (no hardcoded credentials) and include error handling.

## Templates

| # | File | Description | Integrations |
|---|------|-------------|-------------|
| 01 | `01_auto_email_from_sheet.js` | Bulk email sender from spreadsheet data | Gmail, Spreadsheet |
| 02 | `02_sheet_to_pdf.js` | Convert spreadsheet to PDF, save to Drive | Drive, Gmail |
| 03 | `03_form_to_line_notify.js` | Notify LINE when Google Form is submitted | Forms, LINE Notify |
| 04 | `04_weekly_report_generator.js` | Auto-generate weekly HTML reports | Gmail, Spreadsheet |
| 05 | `05_slack_notification.js` | Send Slack alerts on spreadsheet changes | Slack, Spreadsheet |
| 06 | `06_gemini_ai_analysis.js` | AI-powered text classification via Gemini | Gemini 1.5 Flash, Spreadsheet |
| 07 | `07_client_management.js` | Freelance client & project tracking system | Spreadsheet, Gmail |

## Quick Start

1. Open Google Sheets and go to **Extensions > Apps Script**
2. Paste the template code
3. Set required secrets in **Project Settings > Script Properties** (see each file for property names)
4. Run the `initializeSheets()` or `setup()` function
5. Configure time-based triggers as needed

## Security Pattern

All templates store credentials in Script Properties — never hardcoded:

```javascript
const TOKEN = PropertiesService.getScriptProperties().getProperty('YOUR_KEY_NAME');
```

To set a property: **Project Settings > Script Properties > Add property**

## Custom Development

Need a tailored automation for your business? I build custom GAS solutions.

- **Inquiry / Order**: coconala (link coming soon)
- **Delivery**: includes working script + setup manual
- **Support**: 30-day bug-fix guarantee
