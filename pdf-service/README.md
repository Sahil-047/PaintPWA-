# Paint PDF Service

Async PDF generation for PaintPWA — mirrors the **challanRabbit** structure.

## Stack

- **Express** — health + presigned PDF download URLs
- **RabbitMQ** — bill & cash memo PDF job queues
- **AWS S3** — PDF storage
- **MongoDB** — same DB as main API (`Bill`, `CashMemo` collections)
- **Handlebars + Puppeteer** — bill & cash memo PDF layout (`src/hbs/bill.hbs`, `src/hbs/cashmemo.hbs`)

## Structure

```
pdf-service/src/
├── server.ts              # Entry: Express + Mongo + RabbitMQ consumers
├── config/                # aws, rabbitmq, common
├── consumers/             # billPdfConsumer, cashMemoPdfConsumer
├── controllers/           # Presigned URL download
├── lib/                   # aws, mongoose, rabbitmq, winston
├── model/                 # Bill, CashMemo (minimal, shared DB)
├── routes/
├── util/helper/           # pdfGenerator, renderBillTemplate, uploadToS3
├── hbs/                   # bill.hbs, cashmemo.hbs
└── services/storage/      # uploadPdfToS3 (mirror challanRabbit)
```

## Queues

| Queue | Env var | Routing |
|-------|---------|---------|
| Bill PDF | `BILL_PDF_QUEUE` | `paint.exchange` → `paint.bill.pdf.queue` |
| Cash memo PDF | `CASHMEMO_PDF_QUEUE` | `paint.exchange` → `paint.cashmemo.pdf.queue` |

Main PaintPWA **server** publishes jobs; this service consumes them.

## Local setup

1. Copy `.env.example` → `.env` and fill AWS + MongoDB (same `MONGO_URI` as main server).
2. Start RabbitMQ:
   ```bash
   docker compose up rabbitmq -d
   ```
3. Install & run:
   ```bash
   cd pdf-service
   npm install
   npm run dev
   ```

## Message schemas

**Bill PDF**
```json
{
  "tenantId": "...",
  "billId": "...",
  "fileName": "BILL-001.pdf",
  "s3Key": "{tenantId}/bill/BILL-001.pdf",
  "pdfData": { ... }
}
```

**Cash memo PDF**
```json
{
  "tenantId": "...",
  "memoId": "...",
  "fileName": "MEMO-001.pdf",
  "s3Key": "{tenantId}/cashmemo/MEMO-001.pdf",
  "pdfData": { ... }
}
```

## Download API (presigned S3 URL)

- `GET /pdf/bill/pdf/:tenantId/:billId`
- `GET /pdf/cashmemo/pdf/:tenantId/:memoId`
- `GET /pdf/health`

Main app can keep streaming via `/api/bills/:id/pdf` (reads S3) or use these URLs directly.
