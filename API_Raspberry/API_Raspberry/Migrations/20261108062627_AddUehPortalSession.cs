using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class AddUehPortalSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "uehPortalSession",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    CookieHeader = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SavedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    LastValidatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ExpiredAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsValid = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    LastSyncAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastSyncSuccess = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    LastSyncMessage = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LastSyncCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_uehPortalSession", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "uehPortalSession");
        }
    }
}
