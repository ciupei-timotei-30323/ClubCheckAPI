export interface FavoritesProvider {
  readonly isAuthenticated: boolean
  isFavorite(id: number): boolean
  toggle(id: number): void
}
