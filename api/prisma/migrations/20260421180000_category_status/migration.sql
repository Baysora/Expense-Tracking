BEGIN TRY

BEGIN TRAN;

-- Add status column defaulting to ACTIVE
ALTER TABLE [dbo].[ExpenseCategory] ADD [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ExpenseCategory_status_df] DEFAULT 'ACTIVE';

-- Migrate existing inactive rows (dynamic SQL avoids same-batch column resolution issue)
EXEC('UPDATE [dbo].[ExpenseCategory] SET [status] = ''INACTIVE'' WHERE [isActive] = 0');

-- Drop old isActive column
ALTER TABLE [dbo].[ExpenseCategory] DROP CONSTRAINT [ExpenseCategory_isActive_df];
ALTER TABLE [dbo].[ExpenseCategory] DROP COLUMN [isActive];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
