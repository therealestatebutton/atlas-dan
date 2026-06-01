# Sample Lead Data

This directory contains realistic sample lead data for the three South Carolina counties: Horry, Georgetown, and Marion.

## Files

- **horry-county-leads.csv** - 10 sample leads from Horry County
- **georgetown-county-leads.csv** - 10 sample leads from Georgetown County
- **marion-county-leads.csv** - 10 sample leads from Marion County

## Data Structure

Each CSV file contains the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| lead_type | Type of motivated seller lead | pre-foreclosure, tax-delinquent, probate, sheriff-sale, lis-pendens, code-violation, fire-damage, water-shutoff, fsbo, eviction |
| owner_name | Property owner name | James Mitchell |
| address | Property street address | 1247 Ocean Boulevard |
| city | Property city | Myrtle Beach |
| state | Property state | SC |
| zip | Property ZIP code | 29577 |
| mailing_address | Owner mailing address | 1247 Ocean Boulevard |
| mailing_city | Owner mailing city | Myrtle Beach |
| mailing_state | Owner mailing state | SC |
| mailing_zip | Owner mailing ZIP | 29577 |
| county | County name | Horry |
| case_number | Court/legal case number | 2024-CV-12547 |
| filing_date | Date filed/discovered | 2024-03-15 |
| assessed_value | Property assessed value | 285000 |
| tax_year | Tax year for assessment | 2023 |
| lender | Mortgage lender name | First National Bank |
| loan_amount | Original loan amount | 210000 |
| sale_date | Sale date (if applicable) | 2024-06-01 |
| sale_amount | Sale price | 195000 |
| description | Lead description | Lis Pendens filed for property foreclosure |
| source_url | URL where data was found | https://www.horrycountygov.com/court |
| status | Lead status | new, contacted, qualified, closed, not-interested |

## Lead Types

### Pre-Foreclosure
Properties with Lis Pendens filed - legal action initiated by lender for foreclosure.

### Tax Delinquent
Properties with unpaid property taxes. High motivation to sell quickly.

### Probate
Properties in estate probate proceedings. Often motivated to liquidate quickly.

### Sheriff Sale
Properties scheduled for sheriff's sale due to foreclosure or tax delinquency.

### Lis Pendens
Legal notice filed indicating pending lawsuit or foreclosure action.

### Code Violation
Properties with building code violations. Owners may be motivated to sell as-is.

### Fire Damage
Properties damaged by fire. Owners often need to liquidate quickly.

### Water Shutoff
Properties with water service disconnected due to non-payment. Urgent motivation.

### FSBO (For Sale By Owner)
For-sale listings from Craigslist and other classifieds. Owners selling without agent.

### Eviction
Properties with eviction notices filed. Landlords may be motivated to sell.

## Data Quality Notes

- All sample data is fictional but realistic
- Addresses are real South Carolina locations
- Phone numbers and emails are not included (would be added via skip-tracing)
- Dates are realistic for 2024
- Property values are realistic for the regions
- This data can be used for testing, development, and demonstrations

## Importing Sample Data

To import this sample data into the application:

```bash
# Via API
curl -X POST http://localhost:5000/api/leads/import \
  -H "Content-Type: application/json" \
  -d @horry-county-leads.json

# Via database directly
npm run db:import sample-data/horry-county-leads.csv
```

## Next Steps

1. Verify data structure matches application schema
2. Test scraper integration with real county data sources
3. Implement skip-tracing integration for phone/email
4. Set up daily email reports with sample data
5. Configure client-specific filters and preferences
