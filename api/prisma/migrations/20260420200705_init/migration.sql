BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[OpCo] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [OpCo_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpCo_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OpCo_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [OpCo_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [opCoId] NVARCHAR(1000),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[ExpenseCategory] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [ExpenseCategory_isActive_df] DEFAULT 1,
    [opCoId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ExpenseCategory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExpenseCategory_opCoId_name_key] UNIQUE NONCLUSTERED ([opCoId],[name])
);

-- CreateTable
CREATE TABLE [dbo].[Expense] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [amount] DECIMAL(12,2) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [Expense_currency_df] DEFAULT 'USD',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Expense_status_df] DEFAULT 'DRAFT',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Expense_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [submittedById] NVARCHAR(1000) NOT NULL,
    [opCoId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Expense_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ExpenseAttachment] (
    [id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL,
    [sizeBytes] INT NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ExpenseAttachment_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [expenseId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ExpenseAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApprovalRecord] (
    [id] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApprovalRecord_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [expenseId] NVARCHAR(1000) NOT NULL,
    [reviewedById] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ApprovalRecord_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Expense_opCoId_status_idx] ON [dbo].[Expense]([opCoId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Expense_submittedById_idx] ON [dbo].[Expense]([submittedById]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_opCoId_fkey] FOREIGN KEY ([opCoId]) REFERENCES [dbo].[OpCo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExpenseCategory] ADD CONSTRAINT [ExpenseCategory_opCoId_fkey] FOREIGN KEY ([opCoId]) REFERENCES [dbo].[OpCo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Expense] ADD CONSTRAINT [Expense_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[ExpenseCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Expense] ADD CONSTRAINT [Expense_submittedById_fkey] FOREIGN KEY ([submittedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Expense] ADD CONSTRAINT [Expense_opCoId_fkey] FOREIGN KEY ([opCoId]) REFERENCES [dbo].[OpCo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExpenseAttachment] ADD CONSTRAINT [ExpenseAttachment_expenseId_fkey] FOREIGN KEY ([expenseId]) REFERENCES [dbo].[Expense]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRecord] ADD CONSTRAINT [ApprovalRecord_expenseId_fkey] FOREIGN KEY ([expenseId]) REFERENCES [dbo].[Expense]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRecord] ADD CONSTRAINT [ApprovalRecord_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
