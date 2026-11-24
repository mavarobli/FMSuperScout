using System.Reflection;

var scanner = Assembly.Load("FMSuperScout.Scanner");
var dumper = scanner.GetType("FMSuperScout.Dumper", throwOnError: true);
var plausibleClub = dumper.GetMethod("PlausibleClub", BindingFlags.Static | BindingFlags.NonPublic);
var cases = new (string Name, bool Expected)[]
{
    ("莱斯特城", true),
    ("FC 北京", true),
    ("上海申花（女足）", true),
    ("Lech Poznań", true),
    ("A\u0001B", false),
    ("A\uFFFD B", false),
    ("(ИIAЯ)", false),
    ("12", false),
    (" ", false),
};

foreach (var (name, expected) in cases)
{
    if ((bool)plausibleClub.Invoke(null, new object[] { name }) != expected)
        throw new Exception($"Expected PlausibleClub({name}) = {expected}");
}
Console.WriteLine($"Passed {cases.Length} club and competition name checks.");
PersonNameChecks.Run(scanner);
LanguageArchiveChecks.Run(scanner);
