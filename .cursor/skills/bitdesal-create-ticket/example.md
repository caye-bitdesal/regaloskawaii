# Example ticket body

Canonical style to match when drafting. Adapt content; keep structure and tone.

**Title:** Migrate to Jetpack Navigation type-safe API

```markdown
📝 Description

Our current navigation implementation uses a custom WeelDestination interface backed by a Route Enum. While this provides structure for metadata (icons/labels), it lacks compile-time safety for navigation arguments and relies on manual string manipulation (Enum .name property).

We need to migrate to the Jetpack Navigation 2.8.0+ Type-Safe API to eliminate runtime IllegalArgumentException risks and reduce boilerplate.

🚩 Current Problems

_Argument Fragility:_ Passing arguments requires manual string interpolation (e.g., route + "/$id"). This is error-prone and requires manual parsing logic in the destination.
_Type Safety:_ The compiler cannot verify if a caller has provided all required arguments for a specific route.
_Enum Limitations:_ As the app grows, a single flat Route enum becomes difficult to maintain for nested graphs.

🛠 Proposed Solution

Replace the Route enum and string-based routing with Kotlin Serialization classes. We will keep the WeelDestination interface but refactor it to work with @Serializable objects.

Before vs. After Comparison

Current State (Enum-based):

// Definition
object CreateEvent : WeelDestination {
    override val route = Route.CREATE_EVENT.name // "CREATE_EVENT"
}

// Usage
navController.navigate(Route.CREATE_EVENT.name + "/$timestamp")

Proposed State (Type-Safe):

// Definition
@Serializable
data class CreateEvent(val timestamp: Long) : WeelDestination {
    @Transient override val screenName = R.string.create_event
    @Transient override val iconRes = R.drawable.ic_add
}

// Usage
navController.navigate(CreateEvent(timestamp = 1625097600L))

🏗 Implementation Plan

_Dependency Update:_
    Add kotlinx-serialization-json to the project.
    Update androidx.navigation:navigation-compose to version 2.8.0 or higher.
_Refactor WeelDestination:_
    Convert the interface to a sealed interface.
    Mark all destination objects/classes with @Serializable.
    Use @Transient for non-serializable properties like iconRes and screenName to exclude them from the route string.
_Update NavHost:_
    Replace composable(route = "...") with composable<T>.
    Use backStackEntry.toRoute<T>() to extract parameters.
_Cleanup:_
    Deprecate and eventually remove the Route enum.

✅ Acceptance Criteria

All navigation transitions are verified to work without string-based route definitions.
Arguments (e.g., eventId, timestamp) are passed as typed parameters, not strings.
No java.lang.IllegalArgumentException is thrown when navigating with complex data.
Unit tests for the Navigation Graph are updated to use the new types.

🔗 Resources

[Android Developers: Type safety in Navigation Compose](https://developer.android.com/guide/navigation/design/type-safety)
[Kotlin Serialization Guide](https://kotlinlang.org/docs/serialization.html)
```
