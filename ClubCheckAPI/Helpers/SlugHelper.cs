using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ClubCheckAPI.Helpers;

public static partial class SlugHelper
{
    public static string Slugify(string input, string entityName,int maxLength = 150)
    {
        var decomposed = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        var slug = NonAlphanumeric()
            .Replace(sb.ToString().ToLowerInvariant(), "-")
            .Trim('-');

        if (slug.Length > maxLength)
            slug = slug[..maxLength].Trim('-');

        return slug.Length == 0 ? entityName : slug;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphanumeric();
}