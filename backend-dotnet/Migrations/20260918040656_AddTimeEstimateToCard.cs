using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoBacklog.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeEstimateToCard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "time_estimate",
                table: "cards",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "time_estimate",
                table: "cards");
        }
    }
}
