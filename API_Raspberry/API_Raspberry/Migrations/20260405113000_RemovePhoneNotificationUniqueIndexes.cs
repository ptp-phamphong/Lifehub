using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class RemovePhoneNotificationUniqueIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Keep plain indexes in model, but remove UNIQUE constraints that can drop burst notifications.
            migrationBuilder.Sql("DROP INDEX IF EXISTS `IX_PhoneNotification_App_AndroidTime` ON `PhoneNotification`;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS `IX_PhoneNotification_NotificationKey` ON `PhoneNotification`;");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneNotification_App_AndroidTime",
                table: "PhoneNotification",
                columns: new[] { "App", "AndroidTime" },
                filter: "`AndroidTime` IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PhoneNotification_App_AndroidTime",
                table: "PhoneNotification");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneNotification_App_AndroidTime",
                table: "PhoneNotification",
                columns: new[] { "App", "AndroidTime" },
                unique: true,
                filter: "`AndroidTime` IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneNotification_NotificationKey",
                table: "PhoneNotification",
                column: "NotificationKey",
                unique: true,
                filter: "`NotificationKey` IS NOT NULL");
        }
    }
}
