-- company_settingsにCSV出力フォーマット設定カラムを追加
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS csv_export_format jsonb DEFAULT '{}';

-- csv_export_format JSON構造例:
-- {
--   "columns": [
--     { "header": "日付", "field": "date", "fixedValue": "" },
--     { "header": "借方科目", "field": "debit_account", "fixedValue": "" },
--     { "header": "貸方科目", "field": "credit_account", "fixedValue": "" },
--     { "header": "金額", "field": "amount", "fixedValue": "" },
--     { "header": "摘要", "field": "description", "fixedValue": "" },
--     { "header": "税区分", "field": "fixed", "fixedValue": "対象外" }
--   ],
--   "encoding": "utf-8",
--   "delimiter": ","
-- }
