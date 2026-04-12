using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class AddSemesterMetadataReferenceAndYear : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Semester",
                table: "CourseSchedule");

            migrationBuilder.AddColumn<int>(
                name: "Year",
                table: "semesterMetadata",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SemesterMetadataId",
                table: "CourseSchedule",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseSchedule_SemesterMetadataId",
                table: "CourseSchedule",
                column: "SemesterMetadataId");

            migrationBuilder.AddForeignKey(
                name: "FK_CourseSchedule_semesterMetadata_SemesterMetadataId",
                table: "CourseSchedule",
                column: "SemesterMetadataId",
                principalTable: "semesterMetadata",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CourseSchedule_semesterMetadata_SemesterMetadataId",
                table: "CourseSchedule");

            migrationBuilder.DropIndex(
                name: "IX_CourseSchedule_SemesterMetadataId",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "Year",
                table: "semesterMetadata");

            migrationBuilder.DropColumn(
                name: "SemesterMetadataId",
                table: "CourseSchedule");

            migrationBuilder.AddColumn<string>(
                name: "Semester",
                table: "CourseSchedule",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
