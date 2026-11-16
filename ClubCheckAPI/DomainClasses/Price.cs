using System.ComponentModel;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.DomainClasses;

// [ComplexType]
public  class Price : IComparable<Price>, IEquatable<Price>
{
    /// <summary>
    /// Price amount used by the price filter.
    /// </summary>
    [Description("Maximum price value used by the price filter.")]
    [Precision(8, 2)] public decimal Value { get; set; }

    /// <summary>
    /// Currency associated with the price filter value.
    /// </summary>
    [Description("Currency associated with the price filter value.")]
    public Currency? Currency { get; set; }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="value"></param>
    /// <param name="currency">Default value is RON</param>
    public Price(decimal value, Currency? currency = DomainClasses.Currency.RON)
    {
        Value = value;
        Currency = currency;
    }
    
    public Price(){}

    // Operators Overriding

    private static void AreCurrencyTheSame(Price first, Price other)
    {
        if (first.Currency != other.Currency)
        {
            throw new PricesHaveDifferentCurrencyComparationException(first.Currency.ToString(),
                other.Currency.ToString());
        }
    }

    private sealed class ValueCurrencyEqualityComparer : IEqualityComparer<Price>
    {
        public bool Equals(Price? x, Price? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x is null) return false;
            if (y is null) return false;
            if (x.GetType() != y.GetType()) return false;
            return x.Value == y.Value && x.Currency == y.Currency;
        }

        public int GetHashCode(Price obj)
        {
            return HashCode.Combine(obj.Value, obj.Currency);
        }
    }

    public bool Equals(Price? other)
    {
        if (other == null) return false;
        AreCurrencyTheSame(this, other);
        return this.Value.Equals(other.Value);

    }

    public int CompareTo(Price? other)
    {
        if (other == null) return 1;

        AreCurrencyTheSame(this, other);

        return Value.CompareTo(other.Value);
    }

    public static bool operator >(Price a, Price b)
    {
        AreCurrencyTheSame(a, b);

        return a.Value > b.Value;
    }

    public static bool operator <(Price a, Price b)
    {
        AreCurrencyTheSame(a, b);

        return a.Value < b.Value;
    }

    public static bool operator <=(Price? a, Price? b)
    {
        AreCurrencyTheSame(a, b);

        return a.Value <= b.Value;
    }

    public static bool operator >=(Price a, Price b)
    {
        AreCurrencyTheSame(a, b);

        return a.Value >= b.Value;
    }
}