# Life in Receipts

> An interactive data-storytelling web experience that turns everyday digital records into a visual story.

## Live Demo

https://whimsical-pegasus-427b58.netlify.app/

## GitHub Repository

https://github.com/mayankkb34/life-receipts

---

## About the Project

**Life in Receipts** explores how different digital records can overlap to reveal patterns in everyday life.

The project brings together three different datasets:

- Music listening history
- Household transactions
- Location / transaction records

Instead of displaying raw CSV data as tables, the application transforms the records into an interactive receipt-style experience.

Users can explore individual records, search and filter receipts, discover connections between datasets, and view the resulting story through a visual interface.

---

## Key Features

### 1. Overview

The Overview page provides a high-level summary of the available records, including:

- Total receipts
- Music activity
- Transaction activity
- Location-related records
- Highlighted data insights

### 2. Explore

The Explore section allows users to interact with the generated receipts.

Features include:

- Search
- Category filters
- Music receipts
- Purchase receipts
- Place-related receipts
- Individual receipt cards

### 3. Connections

The Connections section looks for overlaps between records and dates from different datasets.

This helps transform isolated records into connected moments.

### 4. Story

The Story section presents selected patterns and insights from the data in a more narrative format.

---

## Data Sources

The project currently uses CSV datasets stored in the `public/data` directory:

```text
public/data/
├── spotify_history.csv
├── Daily Household Transactions.csv
└── Augmented_IndiaTransactMultiFacet2024.csv
