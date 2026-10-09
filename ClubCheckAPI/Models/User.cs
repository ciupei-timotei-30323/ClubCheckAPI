// using System.ComponentModel.DataAnnotations;
//
// namespace ClubCheckAPI.Models;
//
// public class User
// {
//     public int Id { get; set; }
//
//     [MaxLength(100)] public string Name { get; set; }
//
//     [EmailAddress] public string Email { get; set; }
//
//     public string PasswordHashed { get; set; }
//
//     public Preferences Preferences { get; set; }
//
//     public ICollection<Event>? FollowedEvents { get; set; }
//
//     public ICollection<Artist>? FollowedArtists { get; set; }
//
//     public ICollection<Venue>? FollowedVenues { get; set; }
//
//     public ICollection<Genre>? FollowedGenres { get; set; }
//
//     public ICollection<Review>? GivenReviews { get; set; }
//     
// }