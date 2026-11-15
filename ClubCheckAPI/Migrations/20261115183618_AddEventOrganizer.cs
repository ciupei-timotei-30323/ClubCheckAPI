using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubCheckAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddEventOrganizer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Organizer",
                table: "Events",
                type: "character varying(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PosterUrl",
                table: "Events",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Organizer",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "PosterUrl",
                table: "Events");
        }
    }
}
