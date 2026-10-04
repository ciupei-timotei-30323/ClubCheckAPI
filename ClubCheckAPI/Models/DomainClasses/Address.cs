using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubCheckAPI.Models;

// [ComplexType]
public class Address
{
    public Address(string city = "-")
    {
        City = city;
    }

    [MaxLength(12)] public string? ZipCode { get; set; }

    [MaxLength(5)] public string? Number { get; set; }

    [MaxLength(100)] public string? Street { get; set; }

    [MaxLength(100)] public string City { get; set; }

    [MaxLength(100)] public string? County { get; set; }

    [MaxLength(100)] public string? Country { get; set; }

    public Uri? GoogleMapsUrl { get; set; }


    public Address(string? zipCode = null, string? number = null, string? street = null, string city = null,
        string? county = null, string? country = null, Uri? googleMapsUrl = null)
    {
        ZipCode = zipCode;
        Number = number;
        Street = street;
        City = city ?? throw new ArgumentNullException(nameof(city));
        County = county;
        Country = country;
        GoogleMapsUrl = googleMapsUrl;
    }
}