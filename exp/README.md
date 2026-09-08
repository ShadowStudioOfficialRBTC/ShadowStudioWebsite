# Adding an experiment

Put each experiment folder inside `exp/`. Each folder should contain an `index.html`
and an image inside `img/`.

Then add one entry to `exp/experiments.json`:

```json
{
  "title": "Your experiment",
  "description": "A short description.",
  "image": "exp/your-experiment/img/preview.jpg",
  "link": "exp/your-experiment/"
}
```

The landing page and the Projects subpage will display it automatically.