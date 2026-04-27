import React from "react";
import { useNavigate } from "react-router-dom";
import { CreateExpenseRequest } from "@expense/shared";
import { expenseApi, attachmentApi } from "@/lib/api";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export function NewExpense() {
  const navigate = useNavigate();

  return (
     <div className="space-y-5">
       {/* Page header */}
       <div>
         <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "var(--color-text-placeholder)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 14, display: "block", letterSpacing: "0.01em" }}
         >
           ← Back
         </button>
         <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--color-text)", margin: "0 0 4px", lineHeight: 1.2 }}>
          New Expense
         </h1>
         <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>
          Upload your receipt and fill in the details
         </p>
       </div>

       <ExpenseForm
        mode="create"
        onSave={async (data: CreateExpenseRequest, submitNow) => {
          const expense = await expenseApi.create(data);
          if (submitNow) await expenseApi.submit(expense.id);
          navigate("/dashboard");
         }}
        onCancel={() => navigate(-1)}
       />
     </div>
   );
}
