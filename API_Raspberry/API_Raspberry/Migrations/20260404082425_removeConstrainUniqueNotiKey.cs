using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class removeConstrainUniqueNotiKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PhoneNotification_App_AndroidTime",
                table: "PhoneNotification");

            migrationBuilder.DropIndex(
                name: "IX_PhoneNotification_NotificationKey",
                table: "PhoneNotification");

            migrationBuilder.AlterColumn<string>(
                name: "NotificationKey",
                table: "PhoneNotification",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

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

            migrationBuilder.AlterColumn<string>(
                name: "NotificationKey",
                table: "PhoneNotification",
                type: "varchar(255)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

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
