using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoBacklog.Api.Migrations
{
    /// <inheritdoc />
    public partial class DropCardPositionDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "position",
                table: "cards",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "UNSET");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "position",
                table: "cards",
                type: "text",
                nullable: false,
                defaultValue: "UNSET",
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
