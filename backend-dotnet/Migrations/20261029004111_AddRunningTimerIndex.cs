using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoBacklog.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRunningTimerIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_time_logs_card_id_running",
                table: "time_logs",
                column: "card_id",
                unique: true,
                filter: "end_time IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_time_logs_card_id_running",
                table: "time_logs");
        }
    }
}
