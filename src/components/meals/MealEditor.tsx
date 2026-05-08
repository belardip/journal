'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { updateMealAction, addIngredientAction, updateIngredientAction, deleteIngredientAction, parseMealTextAction, importRecipeAction } from '@/app/actions/meals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, Download, FileText, Check, X } from 'lucide-react'
import Link from 'next/link'

type Ingredient = { id: number; mealId: number; name: string; quantity: number | null; unit: string | null; sortOrder: number }
type Meal = { id: number; day: number; type: string; name: string | null; recipeUrl: string | null; originalServings: number | null; notes: string | null; ingredients: Ingredient[] }

interface MealEditorProps {
  meal: Meal
  cooks: string[]
  suggestions: string[]
}

function formatDay(day: number, type: string): string {
  return `Day ${day} — ${type.charAt(0).toUpperCase() + type.slice(1)}`
}

export function MealEditor({ meal, cooks, suggestions }: MealEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [mealName, setMealName] = useState(meal.name ?? '')
  const [recipeUrl, setRecipeUrl] = useState(meal.recipeUrl ?? '')
  const [servings, setServings] = useState(meal.originalServings ?? 4)
  const [notes, setNotes] = useState(meal.notes ?? '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(meal.ingredients)
  const [newIng, setNewIng] = useState({ name: '', quantity: '', unit: '' })
  const [parseText, setParseText] = useState('')
  const [parseOpen, setParseOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{ name: string; quantity: string; unit: string }>({ name: '', quantity: '', unit: '' })

  function saveMeal() {
    startTransition(async () => {
      await updateMealAction(meal.id, {
        name: mealName || null,
        recipeUrl: recipeUrl || null,
        originalServings: servings,
        notes: notes || null,
      })
      toast.success('Meal saved.')
    })
  }

  function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault()
    if (!newIng.name.trim()) return
    startTransition(async () => {
      await addIngredientAction(meal.id, newIng.name.trim(), newIng.quantity ? Number(newIng.quantity) : undefined, newIng.unit || undefined)
      setIngredients(prev => [...prev, { id: Date.now(), mealId: meal.id, name: newIng.name, quantity: newIng.quantity ? Number(newIng.quantity) : null, unit: newIng.unit || null, sortOrder: prev.length }])
      setNewIng({ name: '', quantity: '', unit: '' })
      toast.success('Ingredient added.')
    })
  }

  function handleDeleteIngredient(id: number) {
    startTransition(async () => {
      await deleteIngredientAction(id)
      setIngredients(prev => prev.filter(i => i.id !== id))
    })
  }

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id)
    setEditValues({ name: ing.name, quantity: ing.quantity?.toString() ?? '', unit: ing.unit ?? '' })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({ name: '', quantity: '', unit: '' })
  }

  function saveEdit(id: number) {
    startTransition(async () => {
      await updateIngredientAction(id, {
        name: editValues.name,
        quantity: editValues.quantity ? Number(editValues.quantity) : null,
        unit: editValues.unit || null,
      })
      setIngredients(prev => prev.map(i => i.id === id
        ? { ...i, name: editValues.name, quantity: editValues.quantity ? Number(editValues.quantity) : null, unit: editValues.unit || null }
        : i
      ))
      setEditingId(null)
    })
  }

  function handleParseText() {
    if (!parseText.trim()) return
    startTransition(async () => {
      try {
        const result = await parseMealTextAction(meal.id, parseText, servings)
        setIngredients(result.filter(r => r.name).map((r, i) => ({ id: Date.now() + i, mealId: meal.id, name: r.name, quantity: r.quantity ?? null, unit: r.unit ?? null, sortOrder: i })))
        setParseOpen(false)
        setParseText('')
        toast.success('Ingredients extracted by AI.')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  function handleImport() {
    if (!recipeUrl) { toast.error('Enter a recipe URL first.'); return }
    startTransition(async () => {
      try {
        const result = await importRecipeAction(meal.id, recipeUrl, servings)
        setIngredients(result.filter(r => r.name).map((r, i) => ({ id: Date.now() + i, mealId: meal.id, name: r.name, quantity: r.quantity ?? null, unit: r.unit ?? null, sortOrder: i })))
        setImportOpen(false)
        toast.success('Recipe imported and ingredients extracted.')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/schedule">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Schedule</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{formatDay(meal.day, meal.type)}</h1>
          {cooks.length > 0 && (
            <div className="flex gap-1 mt-1">
              {cooks.map(name => <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>)}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Meal Name</Label>
            <Input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="e.g. Pasta Night" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Recipe URL</Label>
              <Input value={recipeUrl} onChange={e => setRecipeUrl(e.target.value)} placeholder="https://..." type="url" />
            </div>
            <div className="space-y-1.5">
              <Label>Servings (original)</Label>
              <Input value={servings} onChange={e => setServings(Number(e.target.value))} type="number" min={1} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Prep notes, dietary notes, etc."
              className="min-h-20 resize-y"
            />
          </div>
          <Button onClick={saveMeal} disabled={isPending} size="sm">Save Details</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ingredients ({ingredients.length})</CardTitle>
            <div className="flex gap-2">
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Import URL</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Import from Recipe URL</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Will fetch the page and extract ingredients with AI. Make sure the URL and servings are correct first.</p>
                  <div className="space-y-2 mt-2">
                    <p className="text-sm font-medium">URL: <span className="text-muted-foreground">{recipeUrl || '(none set)'}</span></p>
                    <p className="text-sm font-medium">Original servings: <span className="text-muted-foreground">{servings}</span></p>
                  </div>
                  <Button onClick={handleImport} disabled={isPending || !recipeUrl}>
                    {isPending ? 'Importing…' : 'Import & Extract'}
                  </Button>
                </DialogContent>
              </Dialog>

              <Dialog open={parseOpen} onOpenChange={setParseOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" />Paste Text</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Parse Recipe Text</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Paste the recipe text below. AI will extract and scale ingredients to 7 servings.</p>
                  <Textarea
                    value={parseText}
                    onChange={e => setParseText(e.target.value)}
                    placeholder="Paste recipe ingredients here…"
                    className="h-40 resize-y"
                  />
                  <Button onClick={handleParseText} disabled={isPending || !parseText.trim()}>
                    {isPending ? 'Extracting…' : 'Extract Ingredients'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {ingredients.map(ing => (
            <div key={ing.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
              {editingId === ing.id ? (
                <>
                  <Input value={editValues.name} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} className="flex-1 h-7 text-sm" />
                  <Input value={editValues.quantity} onChange={e => setEditValues(v => ({ ...v, quantity: e.target.value }))} className="w-20 h-7 text-sm" placeholder="Qty" type="number" />
                  <Input value={editValues.unit} onChange={e => setEditValues(v => ({ ...v, unit: e.target.value }))} className="w-20 h-7 text-sm" placeholder="Unit" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(ing.id)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm cursor-pointer hover:text-primary" onClick={() => startEdit(ing)}>{ing.name}</span>
                  {(ing.quantity || ing.unit) && (
                    <span className="text-sm text-muted-foreground cursor-pointer" onClick={() => startEdit(ing)}>
                      {ing.quantity} {ing.unit}
                    </span>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteIngredient(ing.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}

          <Separator className="my-3" />

          <form onSubmit={handleAddIngredient} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                list="ingredient-suggestions"
                value={newIng.name}
                onChange={e => setNewIng(v => ({ ...v, name: e.target.value }))}
                placeholder="Ingredient name"
                className="h-8 text-sm"
              />
              <datalist id="ingredient-suggestions">
                {suggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <Input value={newIng.quantity} onChange={e => setNewIng(v => ({ ...v, quantity: e.target.value }))} placeholder="Qty" type="number" className="w-20 h-8 text-sm" />
            <Input value={newIng.unit} onChange={e => setNewIng(v => ({ ...v, unit: e.target.value }))} placeholder="Unit" className="w-20 h-8 text-sm" />
            <Button type="submit" size="sm" disabled={isPending || !newIng.name.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
