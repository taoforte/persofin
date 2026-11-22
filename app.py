import streamlit as st
import pandas as pd
import plotly.express as px

# Page configuration
st.set_page_config(page_title="Personal Finance Tracker", page_icon="💰", layout="wide")

# Title
st.title("💰 Personal Finance Tracker")

# Initialize session state for transactions
if 'transactions' not in st.session_state:
    st.session_state.transactions = pd.DataFrame(columns=["Date", "Description", "Type", "Category", "Amount"])

# Sidebar for input
st.sidebar.header("Add New Transaction")
with st.sidebar.form("transaction_form", clear_on_submit=True):
    date = st.date_input("Date")
    description = st.text_input("Description")
    type_ = st.selectbox("Type", ["Income", "Expense"])
    
    # Dynamic categories based on type
    if type_ == "Income":
        category = st.selectbox("Category", ["Salary", "Freelance", "Investment", "Gift", "Other"])
    else:
        category = st.selectbox("Category", ["Food", "Rent", "Utilities", "Transport", "Entertainment", "Shopping", "Health", "Other"])
    
    amount = st.number_input("Amount", min_value=0.01, step=0.01)
    
    submitted = st.form_submit_button("Add Transaction")

    if submitted:
        new_transaction = pd.DataFrame([{
            "Date": date,
            "Description": description,
            "Type": type_,
            "Category": category,
            "Amount": amount
        }])
        st.session_state.transactions = pd.concat([st.session_state.transactions, new_transaction], ignore_index=True)
        st.success("Transaction added!")

# Main Dashboard
if not st.session_state.transactions.empty:
    df = st.session_state.transactions
    
    # Summary Metrics
    total_income = df[df["Type"] == "Income"]["Amount"].sum()
    total_expense = df[df["Type"] == "Expense"]["Amount"].sum()
    net_balance = total_income - total_expense
    
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Income", f"${total_income:,.2f}", delta_color="normal")
    col2.metric("Total Expenses", f"${total_expense:,.2f}", delta=-total_expense if total_expense > 0 else 0)
    col3.metric("Net Balance", f"${net_balance:,.2f}", delta=net_balance)
    
    st.divider()
    
    # Charts and Data
    col_chart, col_table = st.columns([1, 1])
    
    with col_chart:
        st.subheader("Expenses by Category")
        expense_df = df[df["Type"] == "Expense"]
        if not expense_df.empty:
            fig = px.pie(expense_df, values='Amount', names='Category', hole=0.4)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No expenses recorded yet.")
    
    with col_table:
        st.subheader("Recent Transactions")
        st.dataframe(df.sort_values(by="Date", ascending=False), use_container_width=True)
        
        # Download button
        csv = df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="Download Data as CSV",
            data=csv,
            file_name='finance_data.csv',
            mime='text/csv',
        )

    st.divider()

    # Edit / Delete Transactions
    st.subheader("✏️ Manage Transactions")

    INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Other"]
    EXPENSE_CATEGORIES = ["Food", "Rent", "Utilities", "Transport", "Entertainment", "Shopping", "Health", "Other"]

    # Build a display list mapping labels -> original index
    tx_options = {
        f"{row['Date']} | {row['Description']} | {row['Type']} | {row['Category']} | ${row['Amount']:,.2f}": idx
        for idx, row in df.iterrows()
    }
    selected_label = st.selectbox(
        "Select a transaction to edit or delete",
        options=list(tx_options.keys()),
        key="selected_transaction",
    )
    selected_idx = tx_options[selected_label]
    sel_row = df.loc[selected_idx]

    with st.form("edit_transaction_form"):
        st.markdown(f"**Editing:** `{selected_label}`")
        new_date = st.date_input("Date", value=pd.to_datetime(sel_row["Date"]).date(), key="edit_date")
        new_description = st.text_input("Description", value=sel_row["Description"], key="edit_desc")
        new_type = st.selectbox(
            "Type",
            ["Income", "Expense"],
            index=0 if sel_row["Type"] == "Income" else 1,
            key="edit_type",
        )
        cat_list = INCOME_CATEGORIES if new_type == "Income" else EXPENSE_CATEGORIES
        default_cat_idx = cat_list.index(sel_row["Category"]) if sel_row["Category"] in cat_list else len(cat_list) - 1
        new_category = st.selectbox("Category", cat_list, index=default_cat_idx, key="edit_category")
        new_amount = st.number_input("Amount", min_value=0.01, step=0.01, value=float(sel_row["Amount"]), key="edit_amount")

        btn_col1, btn_col2 = st.columns(2)
        update_btn = btn_col1.form_submit_button("💾 Update Transaction")
        delete_btn = btn_col2.form_submit_button("🗑️ Delete Transaction", help="Removes this transaction permanently")

        if update_btn:
            st.session_state.transactions.loc[selected_idx, ["Date", "Description", "Type", "Category", "Amount"]] = [
                new_date, new_description, new_type, new_category, new_amount
            ]
            st.success("Transaction updated!")
            st.rerun()

        if delete_btn:
            st.session_state.transactions = st.session_state.transactions.drop(selected_idx).reset_index(drop=True)
            st.warning("Transaction deleted.")
            st.rerun()
else:
    st.info("👈 Add your first transaction using the sidebar to get started!")

# Footer
st.markdown("---")
st.caption("Built with Streamlit | Data is stored temporarily in this session.")
