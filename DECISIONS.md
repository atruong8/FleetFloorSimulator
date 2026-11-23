# Fleet Floor Simulator Decisions

Assumptions and Decisions

- Default Grid definition
    - In the UI the default grid is mentioned to be 10 x 8. But in the scenarios creating the floor the default is 5 x 5. So from there I treated the UI and running scenarios 2 different things. Running a scenario of the simulator is different than running the simulator on the UI.

- Obstacles
    - It wasn't clear how obstacles are added in besides an edit mode. So my assumptions is this is only an edit mode thing. So this lead to the assumption that clicking a cell will just spawn a robot and if we wanted to add an obstacle it would be to use the edit mode. By default, clicking a cell is adding a robot. 
    - Another thing is the scenario for obstacles. There's no example of any of the scenarios uses obstacles. So I made sure to add a scenario that involved an obstacle usage and to show blocked.

- Module A
    - Shows the GOTO command but doesn't show a sample scenario. So safe to assume how it's used based on the other scenarios.
    - I wanted to assume that in a situation where 2 robots are doing their GOTO command and one blocks the other, because they should be waiting for at least 3 ticks, if the blocker robot moves, would the initial robot continue it's path or calculate a new one?
        - With this " On each tick, a robot running GOTO finds a shortest path" it would make sense to figure out a new short path as robots are moving on the floor.
    - There were nothing explicit on a charger cell being the same as an obstacle cell, so I assumed that they can't be the same cell because an obstacle blocks movement.

- Module B
    - How chargers are added is vague, so it would make sense to treat it on how obstacles are added. So another edit mode for just chargers are added. Just like obstacles, clicking it once would add the charger to the cell and clicking it again would delete it. 
    - The scenario in this is wrong. after "REPORT BATTERY" it should be 98 because on a floor of 3 x 1 with that queue commands, it's blocked by the wall so it can't move. The robot only moves 2 times and is blocked by the wall.
    - A behavior question came up to me is what should the behavior be if we added a charger on top of a robot? To further that, if it's at 0 battery and charged when added on top, would it continue the queues? 
        - Based on the assesment " A robot that ends a tick on a charger gains 10 battery" so when a robot enters or stays in the cell it gains the charges not when it leaves the cell.
