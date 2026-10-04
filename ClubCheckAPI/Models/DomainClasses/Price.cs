using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;

[NotMapped]
public class Price
{
    [Precision(8, 2)] public decimal Value { get; set; }
    public Currency? Currency { get; set; }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="value"></param>
    /// <param name="currency">Default value is RON</param>
    public Price(decimal value, Currency? currency = Models.Currency.RON)
    {
        Value = value;
        Currency = currency;
    }
}