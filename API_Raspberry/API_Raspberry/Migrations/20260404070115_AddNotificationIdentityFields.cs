using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationIdentityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NotificationId",
                table: "PhoneNotification",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "NotificationKey",
                table: "PhoneNotification",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "NotificationTag",
                table: "PhoneNotification",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneNotification_NotificationKey",
                table: "PhoneNotification",
                column: "NotificationKey",
                unique: true,
                filter: "`NotificationKey` IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PhoneNotification_NotificationKey",
                table: "PhoneNotification");

            migrationBuilder.DropColumn(
                name: "NotificationId",
                table: "PhoneNotification");

            migrationBuilder.DropColumn(
                name: "NotificationKey",
                table: "PhoneNotification");

            migrationBuilder.DropColumn(
                name: "NotificationTag",
                table: "PhoneNotification");
        }
    }
}
