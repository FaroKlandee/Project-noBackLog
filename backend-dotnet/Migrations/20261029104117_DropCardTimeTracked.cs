using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoBacklog.Api.Migrations
{
    /// <inheritdoc />
    public partial class DropCardTimeTracked : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "time_tracked",
                table: "cards");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "time_tracked",
                table: "cards",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
