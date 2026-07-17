using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API_Raspberry.Migrations
{
    /// <inheritdoc />
    public partial class AddWeeklyCourseSessionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClassCode",
                table: "CourseSchedule",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "DisplayWeek",
                table: "CourseSchedule",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EndPeriod",
                table: "CourseSchedule",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "CourseSchedule",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "LearningMode",
                table: "CourseSchedule",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Lecturer",
                table: "CourseSchedule",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "LecturerEmail",
                table: "CourseSchedule",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "SessionDate",
                table: "CourseSchedule",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StartPeriod",
                table: "CourseSchedule",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WeekOfYear",
                table: "CourseSchedule",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClassCode",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "DisplayWeek",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "EndPeriod",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "LearningMode",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "Lecturer",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "LecturerEmail",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "SessionDate",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "StartPeriod",
                table: "CourseSchedule");

            migrationBuilder.DropColumn(
                name: "WeekOfYear",
                table: "CourseSchedule");
        }
    }
}
