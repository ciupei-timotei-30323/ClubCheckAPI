using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubCheckAPI.Models;

[NotMapped]
public class ReviewScoring
{
    [Range(1,5)]
    public int Score  { get; set; }

    public ReviewScoring(int score)
    {
        Score = score;
    }
}