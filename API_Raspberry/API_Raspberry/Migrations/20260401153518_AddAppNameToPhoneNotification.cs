using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class AddAppNameToPhoneNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppName",
                table: "PhoneNotification",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppName",
                table: "PhoneNotification");
        }
    }
}
