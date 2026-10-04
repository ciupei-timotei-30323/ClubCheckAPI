using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;

public class ClubCheckAPIContext : DbContext
{
    public DbSet<User> Users { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<Artist> Artists { get; set; }
    public DbSet<Venue> Venues { get; set; }
    public DbSet<Genre> Genres { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<Preferences> Preferences { get; set; }


    public ClubCheckAPIContext(DbContextOptions<ClubCheckAPIContext> options) : base(options)
    {
    }
    

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Venue>()
            .ComplexProperty(v => v.Address);
        
        modelBuilder.Entity<Event>()
            .ComplexProperty(v => v.Price);
        
        
    }
}