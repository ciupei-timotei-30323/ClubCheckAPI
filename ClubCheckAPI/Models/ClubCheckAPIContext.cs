using System.Text.RegularExpressions;
using ClubCheckAPI.Helpers;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Core;

namespace ClubCheckAPI.Models;

public class ClubCheckAPIContext : DbContext
{
    // public DbSet<User> Users { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<Artist> Artists { get; set; }
    public DbSet<Venue> Venues { get; set; }
    public DbSet<Genre> Genre { get; set; }
    // public DbSet<Review> Reviews { get; set; }
    // public DbSet<Preferences> Preferences { get; set; }


    public ClubCheckAPIContext(DbContextOptions<ClubCheckAPIContext> options) : base(options)
    {
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcConverter>();
    }


    // protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    // {
    //     optionsBuilder
    //         .UseSqlServer(
    //             @"Server=(localdb)\mssqllocaldb;Database=EFQuerying;Trusted_Connection=True;ConnectRetryCount=0",
    //             o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
    // }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Venue>()
            .ComplexProperty(v => v.Address);
        
        modelBuilder.Entity<Event>()
            .ComplexProperty(v => v.Price);
        
        modelBuilder.Entity<Artist>()
            .HasIndex(a => a.Slug).IsUnique();
        
        modelBuilder.Entity<Venue>()
            .HasIndex(v => v.Name)
            .IsUnique();
        
        modelBuilder.Entity<Genre>()
            .HasIndex(g => g.Name)
            .IsUnique();
        
        modelBuilder.Entity<Event>()
            .HasIndex(e => e.Slug).IsUnique();
    }
    
    
}