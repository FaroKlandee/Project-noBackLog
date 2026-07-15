using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoBacklog.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionToCard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "position",
                table: "cards",
                type: "text",
                nullable: false,
                defaultValue: "UNSET");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "position",
                table: "cards");
        }
    }
}
