BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ExpenseCategory] ADD [isShared] BIT NOT NULL CONSTRAINT [ExpenseCategory_isShared_df] DEFAULT 0,
[requiresAttachment] BIT NOT NULL CONSTRAINT [ExpenseCategory_requiresAttachment_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[OpCo] ADD [isHoldCo] BIT NOT NULL CONSTRAINT [OpCo_isHoldCo_df] DEFAULT 0,
[requireAttachmentAboveAmount] DECIMAL(12,2),
[requireAttachmentForAll] BIT NOT NULL CONSTRAINT [OpCo_requireAttachmentForAll_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
