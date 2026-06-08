# ContractIQ API Specification
## RESTful API Design for RedMPS HR Platform

---

## Base Configuration

```
Base URL: https://api.contractiq.redmps.local/api/v1
Authentication: Bearer {JWT_TOKEN}
Response Format: JSON
Rate Limit: 100 requests per minute per user
```

---

## Authentication Endpoints

### POST /auth/login
**Description:** User login with email and password

**Request:**
```json
{
  "email": "sarah@redmps.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "sarah@redmps.com",
    "fullName": "Sarah Johnson",
    "role": "HRManager",
    "permissions": ["contracts.create", "contracts.approve", "employees.view"]
  }
}
```

### POST /auth/refresh
**Description:** Refresh access token using refresh token

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

### POST /auth/logout
**Description:** Logout user (invalidate tokens)

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Contract Endpoints

### GET /contracts
**Description:** List all contracts with filtering and pagination

**Query Parameters:**
```
?status=draft,review,approved
&employeeId=550e8400-e29b-41d4-a716-446655440000
&contractType=permanent,fixed-term
&createdAfter=2024-01-01
&createdBefore=2024-12-31
&page=1
&pageSize=20
&sortBy=createdAt
&sortOrder=desc
```

**Response (200):**
```json
{
  "totalCount": 150,
  "pageNumber": 1,
  "pageSize": 20,
  "data": [
    {
      "contractId": "550e8400-e29b-41d4-a716-446655440000",
      "contractNumber": "CTR-2024-001",
      "employee": {
        "employeeId": "660e8400-e29b-41d4-a716-446655440000",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john.smith@company.com",
        "jobTitle": "Senior Developer"
      },
      "contractType": "Permanent Employment Contract",
      "status": "InReview",
      "createdAt": "2024-06-01T10:30:00Z",
      "createdBy": "Sarah Johnson",
      "submittedAt": "2024-06-02T14:15:00Z",
      "nextApprover": "David Manager",
      "progress": 50
    }
  ]
}
```

### POST /contracts
**Description:** Create new contract

**Request:**
```json
{
  "employeeId": "660e8400-e29b-41d4-a716-446655440000",
  "contractTypeId": "770e8400-e29b-41d4-a716-446655440000",
  "templateId": "880e8400-e29b-41d4-a716-446655440000",
  "details": {
    "jobTitle": "Senior Software Engineer",
    "department": "Engineering",
    "salary": 85000,
    "currency": "USD",
    "salaryFrequency": "Annual",
    "startDate": "2024-07-01",
    "probationPeriod": 3,
    "noticePeriod": 30,
    "address": "123 Main St, City, State 12345"
  },
  "isDraft": true
}
```

**Response (201):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "contractNumber": "CTR-2024-152",
  "status": "Draft",
  "createdAt": "2024-06-05T10:30:00Z",
  "message": "Contract created successfully"
}
```

### GET /contracts/{id}
**Description:** Get contract details

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "contractNumber": "CTR-2024-001",
  "employee": {
    "employeeId": "660e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Smith",
    "idNumber": "9001011234567",
    "email": "john.smith@company.com",
    "department": "Engineering",
    "manager": "Sarah Johnson"
  },
  "contractType": "Permanent Employment Contract",
  "status": "InReview",
  "details": {
    "jobTitle": "Senior Developer",
    "salary": 85000,
    "currency": "USD",
    "salaryFrequency": "Annual",
    "probationPeriod": 3,
    "noticePeriod": 30,
    "address": "123 Main St, City, State 12345",
    "benefits": ["Health Insurance", "401(k)", "Unlimited PTO"]
  },
  "complianceStatus": "Compliant",
  "complianceIssues": [],
  "createdAt": "2024-06-01T10:30:00Z",
  "createdBy": "Sarah Johnson",
  "submittedAt": "2024-06-02T14:15:00Z",
  "approvalWorkflow": [
    {
      "step": 1,
      "role": "HR Manager",
      "approver": "David Manager",
      "status": "Approved",
      "approvedAt": "2024-06-02T15:30:00Z",
      "comments": "Looks good, moving forward"
    },
    {
      "step": 2,
      "role": "Department Director",
      "approver": "Patricia Director",
      "status": "Pending",
      "approvedAt": null,
      "comments": null
    }
  ]
}
```

### PUT /contracts/{id}
**Description:** Update contract details

**Request:**
```json
{
  "details": {
    "salary": 90000,
    "benefits": ["Health Insurance", "401(k)", "Unlimited PTO", "Home Office"]
  }
}
```

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Contract updated successfully",
  "updatedAt": "2024-06-05T12:30:00Z"
}
```

### DELETE /contracts/{id}
**Description:** Delete draft contract

**Response (200):**
```json
{
  "success": true,
  "message": "Contract deleted successfully"
}
```

**Error (409):**
```json
{
  "error": "Cannot delete non-draft contract",
  "status": 409
}
```

### GET /contracts/{id}/preview
**Description:** Get contract preview as HTML

**Response (200):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>/* Contract styling */</style>
</head>
<body>
  <div class="contract-preview">
    <h1>Employment Agreement</h1>
    <p>This Employment Agreement is made and entered into effective as of July 1, 2024...</p>
    <!-- Full contract HTML -->
  </div>
</body>
</html>
```

### POST /contracts/{id}/submit
**Description:** Submit contract for approval

**Request:**
```json
{
  "comments": "Please review for compliance"
}
```

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "InReview",
  "nextApprover": "David Manager",
  "message": "Contract submitted for approval"
}
```

### POST /contracts/{id}/export
**Description:** Export contract in specified format

**Request:**
```json
{
  "format": "pdf" // or "docx"
}
```

**Response (200):**
Binary file (PDF or DOCX)

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="CTR-2024-001.pdf"
```

---

## Employee Endpoints

### GET /employees
**Description:** List employees with search and filtering

**Query Parameters:**
```
?search=john
&department=Engineering
&status=active
&page=1
&pageSize=20
```

**Response (200):**
```json
{
  "totalCount": 250,
  "pageNumber": 1,
  "pageSize": 20,
  "data": [
    {
      "employeeId": "660e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Smith",
      "idNumber": "9001011234567",
      "email": "john.smith@company.com",
      "department": "Engineering",
      "jobTitle": "Senior Developer",
      "manager": "Sarah Johnson",
      "startDate": "2020-01-15",
      "status": "Active",
      "contractCount": 2,
      "lastContractStatus": "Executed"
    }
  ]
}
```

### POST /employees
**Description:** Create new employee record

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "idNumber": "9001011234567",
  "email": "john.smith@company.com",
  "department": "Engineering",
  "jobTitle": "Senior Developer",
  "managerId": "550e8400-e29b-41d4-a716-446655440000",
  "startDate": "2024-07-01"
}
```

**Response (201):**
```json
{
  "employeeId": "660e8400-e29b-41d4-a716-446655440000",
  "message": "Employee created successfully"
}
```

### GET /employees/{id}
**Description:** Get employee details

**Response (200):**
```json
{
  "employeeId": "660e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Smith",
  "idNumber": "9001011234567",
  "email": "john.smith@company.com",
  "phone": "+1 (555) 123-4567",
  "department": "Engineering",
  "jobTitle": "Senior Developer",
  "grade": "Level 5",
  "manager": {
    "managerId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Sarah Johnson"
  },
  "startDate": "2020-01-15",
  "status": "Active",
  "contracts": [
    {
      "contractId": "550e8400-e29b-41d4-a716-446655440000",
      "contractNumber": "CTR-2020-001",
      "type": "Permanent Employment",
      "status": "Executed",
      "startDate": "2020-01-15",
      "endDate": null
    }
  ]
}
```

### GET /employees/{id}/contracts
**Description:** Get all contracts for an employee

**Response (200):**
```json
{
  "employeeId": "660e8400-e29b-41d4-a716-446655440000",
  "employeeName": "John Smith",
  "totalContracts": 3,
  "contracts": [
    {
      "contractId": "550e8400-e29b-41d4-a716-446655440000",
      "contractNumber": "CTR-2020-001",
      "type": "Permanent Employment",
      "status": "Executed",
      "startDate": "2020-01-15",
      "endDate": null,
      "createdAt": "2020-01-10"
    }
  ]
}
```

### POST /employees/batch-import
**Description:** Import multiple employees from CSV

**Request (multipart/form-data):**
```
CSV file with columns:
FirstName, LastName, IdNumber, Email, Department, JobTitle, ManagerName, StartDate
```

**Response (200):**
```json
{
  "totalImported": 150,
  "successful": 148,
  "failed": 2,
  "errors": [
    {
      "row": 5,
      "reason": "Invalid email format"
    }
  ]
}
```

---

## Approval Endpoints

### GET /approvals
**Description:** Get pending approvals for current user

**Query Parameters:**
```
?status=pending
&page=1
&pageSize=20
```

**Response (200):**
```json
{
  "totalCount": 8,
  "pageNumber": 1,
  "pageSize": 20,
  "data": [
    {
      "contractId": "550e8400-e29b-41d4-a716-446655440000",
      "contractNumber": "CTR-2024-001",
      "employee": "John Smith",
      "jobTitle": "Senior Developer",
      "contractType": "Permanent Employment",
      "salary": 85000,
      "submittedBy": "Sarah Johnson",
      "submittedAt": "2024-06-02T14:15:00Z",
      "daysPending": 2,
      "priority": "Normal"
    }
  ]
}
```

### POST /approvals/{contractId}/approve
**Description:** Approve a contract

**Request:**
```json
{
  "comments": "Looks good. Approved for execution."
}
```

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "Approved",
  "nextStep": "Director Approval",
  "nextApprover": "Patricia Director",
  "message": "Contract approved successfully"
}
```

### POST /approvals/{contractId}/reject
**Description:** Reject a contract with comments

**Request:**
```json
{
  "comments": "Salary seems too high for this level. Please review with department head."
}
```

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "Rejected",
  "returnedTo": "Sarah Johnson",
  "message": "Contract rejected and returned to creator"
}
```

### POST /approvals/{contractId}/escalate
**Description:** Escalate contract to higher authority

**Request:**
```json
{
  "reason": "Need executive approval for salary package"
}
```

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "escalatedTo": "CEO",
  "message": "Contract escalated successfully"
}
```

---

## Template Endpoints

### GET /templates
**Description:** List contract templates

**Query Parameters:**
```
?contractType=permanent
&isActive=true
```

**Response (200):**
```json
{
  "data": [
    {
      "templateId": "880e8400-e29b-41d4-a716-446655440000",
      "templateName": "Permanent Employment - Standard",
      "contractType": "Permanent Employment Contract",
      "version": 2,
      "lastUpdated": "2024-05-15",
      "createdBy": "Admin",
      "isActive": true
    }
  ]
}
```

### POST /templates
**Description:** Create new template

**Request:**
```json
{
  "templateName": "Contractor - IT Services",
  "contractTypeId": "770e8400-e29b-41d4-a716-446655440000",
  "templateContent": "<html><!-- Template content --></html>",
  "placeholders": ["{{employeeName}}", "{{salary}}", "{{startDate}}"]
}
```

**Response (201):**
```json
{
  "templateId": "880e8400-e29b-41d4-a716-446655440000",
  "message": "Template created successfully"
}
```

### GET /templates/{id}
**Description:** Get template details

**Response (200):**
```json
{
  "templateId": "880e8400-e29b-41d4-a716-446655440000",
  "templateName": "Permanent Employment - Standard",
  "contractType": "Permanent Employment Contract",
  "templateContent": "<html><!-- Full template content --></html>",
  "placeholders": ["{{firstName}}", "{{lastName}}", "{{salary}}", "{{startDate}}"],
  "version": 2,
  "createdBy": "Admin",
  "createdAt": "2024-01-10",
  "lastUpdatedBy": "Admin",
  "lastUpdatedAt": "2024-05-15"
}
```

---

## Analytics Endpoints

### GET /analytics/dashboard
**Description:** Get dashboard KPIs

**Response (200):**
```json
{
  "period": "June 2024",
  "kpis": {
    "totalContracts": 152,
    "contractsThisMonth": 12,
    "pendingApprovals": 5,
    "averageTimeToSignature": 4.5,
    "compliancePassRate": 98.5
  },
  "trend": {
    "contractsMonthlyTrend": [
      {"month": "April", "count": 8},
      {"month": "May", "count": 10},
      {"month": "June", "count": 12}
    ],
    "complianceIssuesTrend": [
      {"month": "April", "issues": 2},
      {"month": "May", "issues": 1},
      {"month": "June", "issues": 0}
    ]
  }
}
```

### GET /analytics/contracts/report
**Description:** Get detailed contracts report

**Query Parameters:**
```
?startDate=2024-06-01
&endDate=2024-06-30
&groupBy=status,contractType,department
&export=false
```

**Response (200):**
```json
{
  "reportPeriod": "2024-06-01 to 2024-06-30",
  "summary": {
    "totalContracts": 12,
    "byStatus": {
      "Draft": 2,
      "InReview": 1,
      "Approved": 3,
      "Signed": 6
    },
    "byContractType": {
      "Permanent": 8,
      "Fixed-Term": 3,
      "Intern": 1
    },
    "byDepartment": {
      "Engineering": 5,
      "Sales": 4,
      "HR": 2,
      "Finance": 1
    }
  },
  "averageMetrics": {
    "daysToApproval": 2.3,
    "averageSalary": 75000
  }
}
```

### GET /analytics/approvals/metrics
**Description:** Get approval workflow metrics

**Response (200):**
```json
{
  "approverMetrics": [
    {
      "approver": "David Manager",
      "role": "HR Manager",
      "totalReviewed": 45,
      "averageTimeToApprove": 1.2,
      "approvalRate": 98,
      "rejectionRate": 2
    }
  ],
  "workflowMetrics": {
    "totalContractsStarted": 50,
    "totalContractsCompleted": 48,
    "averageCycleDays": 3.5,
    "bottleneck": "Director Approval (avg 2.1 days)"
  }
}
```

---

## Compliance Endpoints

### GET /compliance/rules
**Description:** Get all active compliance rules

**Response (200):**
```json
{
  "data": [
    {
      "ruleId": "990e8400-e29b-41d4-a716-446655440000",
      "ruleName": "Minimum Wage Requirement",
      "ruleType": "MinimumWage",
      "ruleValue": {
        "minimumWageUsd": 15,
        "effectiveDate": "2024-01-01"
      },
      "isActive": true
    }
  ]
}
```

### POST /contracts/{id}/validate
**Description:** Validate contract against compliance rules

**Response (200):**
```json
{
  "contractId": "550e8400-e29b-41d4-a716-446655440000",
  "overallStatus": "Compliant",
  "checks": [
    {
      "checkName": "Minimum Wage",
      "status": "Pass",
      "value": "$85,000 annual",
      "minimum": "$15/hour"
    },
    {
      "checkName": "Probation Period",
      "status": "Pass",
      "value": "3 months",
      "maximum": "12 months"
    }
  ],
  "issues": [],
  "warnings": []
}
```

---

## System Endpoints

### GET /system/config
**Description:** Get system configuration

**Response (200):**
```json
{
  "appName": "ContractIQ",
  "version": "1.0.0",
  "environment": "production",
  "features": {
    "aiSuggestions": true,
    "digitalSignatures": true,
    "batchImport": true
  },
  "contractTypes": ["Permanent", "FixedTerm", "Intern", "Consultant"],
  "currencies": ["USD", "EUR", "ZAR"],
  "timeZone": "UTC"
}
```

### POST /system/health-check
**Description:** Health check endpoint

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-06-05T12:00:00Z",
  "services": {
    "database": "operational",
    "cache": "operational",
    "fileStorage": "operational"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Resource not found",
  "status": 404,
  "message": "Contract with ID 550e8400-e29b-41d4-a716-446655440000 does not exist",
  "timestamp": "2024-06-05T12:00:00Z",
  "requestId": "req-12345"
}
```

### Common Status Codes

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limiting

All endpoints respect rate limiting:

**Headers Returned:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1717593600
```

When limit exceeded (429):
```json
{
  "error": "Rate limit exceeded",
  "message": "Please wait 60 seconds before making another request",
  "retryAfter": 60
}
```

---

*API Specification Version: 1.0*  
*Last Updated: June 5, 2026*  
*Status: Production*
