# ContractIQ — Implementation & Deployment Guide
## Complete Technical Blueprint for Development Teams

---

## PHASE 1: MVP DEVELOPMENT (Months 1-3)

### Milestone 1.1: Project Setup & Infrastructure (Week 1-2)

**Frontend Setup:**
```bash
# Create Angular project
ng new contractiq --routing --style=scss --strict

# Install core dependencies
npm install -D tailwindcss postcss autoprefixer
npm install @angular/material @angular/cdk
npm install rxjs axios signaturepads
npm install pdfmake jspdf docx

# Setup Tailwind
npx tailwindcss init -p
```

**Backend Setup:**
```bash
# Create ASP.NET Core API
dotnet new sln -n RedMPS.ContractIQ
dotnet new webapi -n RedMPS.ContractIQ.Api -f net8.0
dotnet new classlib -n RedMPS.ContractIQ.Core
dotnet new classlib -n RedMPS.ContractIQ.Infrastructure

# Add NuGet packages
dotnet add RedMPS.ContractIQ.Api package Microsoft.EntityFrameworkCore
dotnet add RedMPS.ContractIQ.Api package Serilog
dotnet add RedMPS.ContractIQ.Api package AutoMapper
dotnet add RedMPS.ContractIQ.Api package MediatR
dotnet add RedMPS.ContractIQ.Api package FluentValidation
```

**Database Setup:**
```bash
# PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
createdb contractiq_dev
createdb contractiq_test

# Run migrations
psql contractiq_dev < database_schema.sql
```

### Milestone 1.2: Authentication & Authorization (Week 2-3)

**Implement JWT Authentication:**
```csharp
// Program.cs
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"])),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// RBAC middleware
app.UseAuthorization();
```

**Implement User/Role tables:**
- Create `users` table with password hashing (bcrypt)
- Create `roles` table with permissions as JSON
- Create audit logging for all access

**Add login endpoint:**
```csharp
[HttpPost("auth/login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    var user = await _userService.AuthenticateAsync(request.Email, request.Password);
    if (user == null) return Unauthorized();
    
    var token = _tokenService.GenerateJwt(user);
    return Ok(new { accessToken = token, user = user });
}
```

### Milestone 1.3: Employee & Contract Models (Week 3-4)

**Create Database Models:**
```csharp
// Employee entity
public class Employee
{
    public Guid EmployeeId { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string IdNumber { get; set; }
    public string Email { get; set; }
    public Guid DepartmentId { get; set; }
    public string JobTitle { get; set; }
    public DateTime StartDate { get; set; }
    public string EmploymentStatus { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Contract entity
public class Contract
{
    public Guid ContractId { get; set; }
    public string ContractNumber { get; set; }
    public Guid EmployeeId { get; set; }
    public Guid ContractTypeId { get; set; }
    public string Status { get; set; } // draft, in_review, approved, executed
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    
    public Employee Employee { get; set; }
    public ContractType ContractType { get; set; }
}

// Contract details (dynamic fields)
public class ContractDetail
{
    public Guid DetailId { get; set; }
    public Guid ContractId { get; set; }
    public string FieldName { get; set; }
    public string FieldValue { get; set; }
    public string DataType { get; set; }
}
```

**Create Entity Framework DbContext:**
```csharp
public class ContractIQContext : DbContext
{
    public DbSet<User> Users { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Contract> Contracts { get; set; }
    public DbSet<ContractDetail> ContractDetails { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure relationships, indexes, constraints
        modelBuilder.Entity<Contract>()
            .HasOne(c => c.Employee)
            .WithMany()
            .HasForeignKey(c => c.EmployeeId);
    }
}
```

### Milestone 1.4: Core API Endpoints (Week 4-5)

**Implement Controllers:**

```csharp
[ApiController]
[Route("api/contracts")]
[Authorize]
public class ContractsController : ControllerBase
{
    private readonly IMediator _mediator;
    
    [HttpGet]
    public async Task<IActionResult> GetContracts([FromQuery] GetContractsQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }
    
    [HttpPost]
    public async Task<IActionResult> CreateContract([FromBody] CreateContractCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetContract), new { id = result.ContractId }, result);
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetContract(Guid id)
    {
        var query = new GetContractByIdQuery { ContractId = id };
        var result = await _mediator.Send(query);
        if (result == null) return NotFound();
        return Ok(result);
    }
}

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController : ControllerBase
{
    // Similar pattern for employee endpoints
}
```

### Milestone 1.5: Frontend Components (Week 5-6)

**Create Angular Modules:**
```typescript
// app.module.ts
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RoutingModule,
    SharedModule,
    DashboardModule,
    ContractsModule,
    WizardModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
})
export class AppModule { }
```

**Create Core Components:**
```typescript
// dashboard.component.ts
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dashboardData: DashboardData;
  loading = true;
  
  constructor(private contractService: ContractService) {}
  
  ngOnInit() {
    this.loadDashboardData();
  }
  
  loadDashboardData() {
    this.contractService.getDashboardData().subscribe(
      (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      (error) => console.error(error)
    );
  }
}
```

### Milestone 1.6: Contract Form (Week 6-7)

HR only populates **7 fields** — the contract template handles all standard legal clauses.

| Field | Form control | Contract section |
|-------|--------------|------------------|
| Name & Surname | `firstName`, `lastName` | Parties, signature |
| ID Number | `idNumber` | Parties |
| Role | `role` | Position |
| Salary | `salary` (monthly ZAR) | Remuneration |
| Address | `address` | Parties |
| Probation Period | `probationPeriod` (months) | Probation clause |
| Notice Period | `noticePeriod` (text) | Probation clause |

**Implement Reactive Forms:**
```typescript
// contract-form.component.ts
@Component({
  selector: 'app-contract-form',
  templateUrl: './contract-form.component.html'
})
export class ContractFormComponent {
  contractForm: FormGroup;

  constructor(private fb: FormBuilder, private contractService: ContractService) {
    this.contractForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      idNumber: ['', Validators.required],
      role: ['', Validators.required],
      salary: ['', [Validators.required, Validators.min(0)]],
      address: ['', Validators.required],
      probationPeriod: [3, [Validators.required, Validators.min(0)]],
      noticePeriod: ['1 week', Validators.required]
    });
  }

  generatePreview() {
    if (this.contractForm.valid) {
      this.contractService.generateContract(this.contractForm.value).subscribe(
        (result) => { /* Navigate to preview */ }
      );
    }
  }
}
```

### Milestone 1.7: PDF Generation (Week 7-8)

**Implement PDFMake or jsPDF:**
```typescript
// contract-export.service.ts
export class ContractExportService {
  exportToPDF(contract: Contract): void {
    const docDefinition = {
      content: [
        { text: 'EMPLOYMENT CONTRACT', style: 'header' },
        { text: `Reference: ${contract.contractNumber}`, style: 'subheader' },
        
        { text: '1. PARTIES', style: 'sectionTitle' },
        { text: this.getPartiesText(contract), style: 'normal' },
        
        { text: '2. POSITION & COMMENCEMENT', style: 'sectionTitle' },
        { text: this.getPositionText(contract), style: 'normal' },
        
        // ... more sections
        
        { text: '3. REMUNERATION', style: 'sectionTitle' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*'],
            body: [
              ['Component', 'Monthly', 'Annual'],
              ['Basic Salary', `R${contract.salary}`, `R${contract.salary * 12}`],
            ]
          }
        },
        
        { text: '4. SIGNATURES', style: 'sectionTitle' },
        this.getSignatureTable(contract)
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center' },
        sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
        normal: { fontSize: 11, alignment: 'justified' }
      }
    };
    
    pdfMake.createPdf(docDefinition).download(`${contract.contractNumber}.pdf`);
  }
}
```

### Milestone 1.8: Testing & Deployment (Week 8)

**Unit Tests:**
```csharp
[TestClass]
public class ContractServiceTests
{
    private ContractService _service;
    private Mock<IRepository<Contract>> _mockRepository;
    
    [TestInitialize]
    public void Setup()
    {
        _mockRepository = new Mock<IRepository<Contract>>();
        _service = new ContractService(_mockRepository.Object);
    }
    
    [TestMethod]
    public async Task CreateContract_ValidData_ReturnsContract()
    {
        var command = new CreateContractCommand { /* ... */ };
        var result = await _service.CreateContractAsync(command);
        
        Assert.IsNotNull(result);
        Assert.AreEqual("draft", result.Status);
    }
}
```

**Integration Tests:**
```typescript
describe('ContractsController', () => {
  let component: ContractsComponent;
  let fixture: ComponentFixture<ContractsComponent>;
  let contractService: ContractService;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContractsComponent],
      providers: [ContractService]
    }).compileComponents();
  });
  
  it('should load contracts', fakeAsync(() => {
    const mockContracts = [/* ... */];
    spyOn(contractService, 'getContracts').and.returnValue(of(mockContracts));
    
    fixture.detectChanges();
    tick();
    
    expect(component.contracts).toEqual(mockContracts);
  }));
});
```

---

## PHASE 2: ADVANCED FEATURES (Months 4-6)

### Milestone 2.1: Multiple Contract Types

**Support 8+ Contract Types:**
- Permanent Employment
- Fixed-Term (12, 24, 36 months)
- Internship/Learnership
- Consultant/Contractor
- Offer Letter
- Promotion/Transfer/Warning Letter

**Template System:**
```csharp
public class TemplateService
{
    public async Task<Template> GetTemplateAsync(Guid contractTypeId)
    {
        // Load template from database
        // Replace placeholders with actual values
        // Return HTML/document content
    }
    
    public async Task<string> RenderTemplateAsync(Contract contract)
    {
        var template = await GetTemplateAsync(contract.ContractTypeId);
        var rendered = ReplacePlaceholders(template.Content, contract);
        return rendered;
    }
}
```

### Milestone 2.2: Advanced Approval Workflows

**Configurable Approval Pipeline:**
```csharp
public class ApprovalWorkflowService
{
    public async Task<ApprovalWorkflow[]> GetApprovalPathAsync(Contract contract)
    {
        // Determine approval path based on:
        // - Salary level
        // - Department
        // - Contract type
        // - Jurisdiction requirements
        
        var steps = new List<ApprovalWorkflow>();
        
        if (contract.Salary > 100000)
        {
            steps.Add(new ApprovalWorkflow { StepNumber = 1, Role = "HR Manager" });
            steps.Add(new ApprovalWorkflow { StepNumber = 2, Role = "Director" });
            steps.Add(new ApprovalWorkflow { StepNumber = 3, Role = "CEO" });
        }
        else
        {
            steps.Add(new ApprovalWorkflow { StepNumber = 1, Role = "HR Manager" });
            steps.Add(new ApprovalWorkflow { StepNumber = 2, Role = "Director" });
        }
        
        return steps.ToArray();
    }
}
```

### Milestone 2.3: DOCX Export

**Implement DOCX Generation:**
```typescript
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';

export class DocxExportService {
  exportToDocx(contract: Contract): void {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: 'EMPLOYMENT CONTRACT',
            style: 'Heading1'
          }),
          new Paragraph({
            text: `Reference: ${contract.contractNumber}`
          }),
          new Table({
            rows: [
              new TableRow({
                cells: [
                  new TableCell({ children: [new Paragraph('Component')] }),
                  new TableCell({ children: [new Paragraph('Amount')] })
                ]
              })
            ]
          })
        ]
      }]
    });
    
    Packer.toBlob(doc).then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contract.contractNumber}.docx`;
      link.click();
    });
  }
}
```

### Milestone 2.4: Analytics Dashboard

**Implement KPI Dashboard:**
```csharp
[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IContractRepository _repository;
    
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardKPIs()
    {
        var kpis = new
        {
            TotalContracts = await _repository.CountAsync(),
            ContractsThisMonth = await _repository.CountAsync(c => 
                c.CreatedAt.Month == DateTime.Now.Month),
            PendingApprovals = await _repository.CountAsync(c => 
                c.Status == "in_review"),
            AverageTimeToSignature = await CalculateAverageTimeAsync(),
            CompliancePassRate = await CalculateComplianceRateAsync()
        };
        
        return Ok(kpis);
    }
}
```

### Milestone 2.5: Batch Import

**Implement CSV Import:**
```typescript
export class BulkImportService {
  importEmployees(file: File): Observable<ImportResult> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const csv = e.target.result as string;
        const rows = csv.split('\n');
        const headers = rows[0].split(',');
        const employees = [];
        
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].split(',');
          const employee = {};
          
          headers.forEach((header, index) => {
            employee[header.trim()] = cells[index]?.trim();
          });
          
          employees.push(employee);
        }
        
        this.apiService.bulkImport(employees).subscribe(
          result => observer.next(result)
        );
      };
      
      reader.readAsText(file);
    });
  }
}
```

---

## PHASE 3: INTELLIGENCE LAYER (Months 7-9)

### Milestone 3.1: AI-Powered Suggestions

**Implement Recommendation Engine:**
```csharp
public class AIRecommendationService
{
    private readonly IContractRepository _repository;
    
    public async Task<AIRecommendations> GetSuggestionsAsync(Contract contract)
    {
        var recommendations = new AIRecommendations();
        
        // Recommend probation period based on role
        var similarContracts = await _repository.GetSimilarAsync(
            contract.ContractTypeId, contract.Department);
        
        var avgProbation = similarContracts.Average(c => c.ProbationPeriodMonths);
        recommendations.SuggestedProbationMonths = (int)Math.Round(avgProbation);
        
        // Recommend notice period based on level
        var level = GetEmployeeLevel(contract.JobTitle);
        recommendations.SuggestedNoticeDays = level match
        {
            "Executive" => 90,
            "Senior" => 60,
            "Mid-level" => 30,
            _ => 14
        };
        
        // Recommend benefits based on industry standard
        recommendations.SuggestedBenefits = GetStandardBenefits(level);
        
        return recommendations;
    }
}
```

### Milestone 3.2: Compliance Intelligence

**Smart Compliance Checking:**
```csharp
public class ComplianceCheckService
{
    public async Task<ComplianceCheckResult> ValidateContractAsync(Contract contract)
    {
        var result = new ComplianceCheckResult();
        var issues = new List<ComplianceIssue>();
        
        // Check minimum wage
        var minimumWage = await GetMinimumWageAsync(contract.Jurisdiction);
        if (contract.AnnualSalary < minimumWage * 12)
        {
            issues.Add(new ComplianceIssue 
            { 
                Level = "Error",
                Message = $"Salary below minimum wage (${minimumWage}/hour)"
            });
        }
        
        // Check required clauses
        var requiredClauses = await GetRequiredClausesAsync(contract.ContractType);
        foreach (var clause in requiredClauses)
        {
            if (!contract.Content.Contains(clause))
            {
                issues.Add(new ComplianceIssue
                {
                    Level = "Warning",
                    Message = $"Missing required clause: {clause}"
                });
            }
        }
        
        result.Issues = issues;
        result.IsCompliant = !issues.Any(i => i.Level == "Error");
        
        return result;
    }
}
```

### Milestone 3.3: Digital Signatures

**Integrate DocuSign or SignNow:**
```typescript
export class SignatureService {
  initiateSignature(contract: Contract, signers: Signer[]): Observable<SignatureResponse> {
    const envelopeDefinition = {
      emailSubject: `Please sign contract ${contract.contractNumber}`,
      documents: [{
        documentBase64: this.encodeDocument(contract),
        name: `${contract.contractNumber}.pdf`,
        documentId: contract.contractId
      }],
      recipients: {
        signers: signers.map(s => ({
          email: s.email,
          name: s.name,
          recipientId: s.id,
          routingOrder: s.routingOrder,
          tabs: [{
            signHereTabs: [{
              pageNumber: 1,
              xPosition: 100,
              yPosition: 100
            }]
          }]
        }))
      },
      status: 'sent'
    };
    
    return this.docusignApiService.createEnvelope(envelopeDefinition);
  }
}
```

---

## DEPLOYMENT & OPERATIONS

### Development Environment
```bash
# Docker Compose for local development
docker-compose -f docker-compose.dev.yml up

# Includes: PostgreSQL, Redis, API, Frontend dev server
```

### Staging Environment
```bash
# Deploy to AWS (example)
aws eks update-kubeconfig --name contractiq-staging
kubectl apply -f k8s/staging/

# Database backup
pg_dump contractiq_staging | gzip > backups/contractiq_staging.sql.gz
```

### Production Environment
```bash
# Production deployment with SSL/TLS
kubectl apply -f k8s/production/
kubectl apply -f k8s/ingress-production.yml

# Enable auto-scaling
kubectl autoscale deployment contractiq-api --min=3 --max=10
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy ContractIQ
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm run test:unit
          dotnet test
          
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t contractiq:${{ github.sha }} .
      - name: Push to ECR
        run: aws ecr push contractiq:${{ github.sha }}
        
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/contractiq-api \
            contractiq-api=contractiq:${{ github.sha }}
```

---

## KEY DELIVERABLES CHECKLIST

### MVP Phase (Month 3)
- ✅ User authentication & authorization
- ✅ Employee management (CRUD)
- ✅ Contract creation (wizard)
- ✅ PDF export
- ✅ Basic approval workflow (2-3 steps)
- ✅ Dashboard with 4 KPIs
- ✅ Compliance basic validation

### Phase 2 (Month 6)
- ✅ 8+ contract types
- ✅ Advanced approval workflows
- ✅ DOCX export
- ✅ Analytics dashboard
- ✅ Batch employee import
- ✅ Email notifications

### Phase 3 (Month 9)
- ✅ AI recommendations
- ✅ Advanced compliance checking
- ✅ Digital signature integration
- ✅ Template management
- ✅ Predictive analytics

---

## SUCCESS METRICS

| Metric | Target | Timeline |
|--------|--------|----------|
| System Uptime | 99.5% | Month 3+ |
| Avg Contract Time | < 5 min | Month 3 |
| Compliance Pass Rate | > 95% | Month 6 |
| User Adoption | > 80% of HR team | Month 3 |
| NPS Score | > 50 | Month 6 |
| Support Tickets | < 5/week | Month 6 |

---

*Implementation Guide Version: 1.0*  
*Last Updated: June 5, 2026*  
*Status: Ready for Development*
